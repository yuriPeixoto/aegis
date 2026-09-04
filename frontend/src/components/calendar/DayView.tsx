import type { TFunction } from 'i18next'
import type { MouseEvent } from 'react'
import type { CalendarEvent } from '../../types/calendar'
import { EventChip } from './EventChip'
import { toMinutes } from './time'

const HOURS = Array.from({ length: 24 }, (_, h) => h)
export const ROW_HEIGHT = 56 // px por hora
const GRID_HEIGHT = HOURS.length * ROW_HEIGHT

interface PositionedEvent {
  event: CalendarEvent
  top: number
  height: number
  column: number
  columns: number
}

// Agrupa eventos com horário em clusters de sobreposição e atribui coluna
// a cada um dentro do cluster (layout tipo Google Calendar, versão simples).
function layoutTimedEvents(events: CalendarEvent[]): PositionedEvent[] {
  const withSpan = events
    .filter((ev) => ev.start_time)
    .map((ev) => {
      const start = toMinutes(ev.start_time as string)
      const end = ev.end_time ? Math.max(toMinutes(ev.end_time), start + 15) : start + 30
      return { event: ev, start, end }
    })
    .sort((a, b) => a.start - b.start || a.end - b.end)

  const positioned: PositionedEvent[] = []
  let cluster: typeof withSpan = []
  let clusterEnd = -1

  function flushCluster() {
    if (cluster.length === 0) return
    // Atribuição gulosa de coluna: cada evento pega a primeira coluna livre
    const columnEnds: number[] = []
    const withColumn = cluster.map((item) => {
      let col = columnEnds.findIndex((end) => end <= item.start)
      if (col === -1) {
        col = columnEnds.length
        columnEnds.push(item.end)
      } else {
        columnEnds[col] = item.end
      }
      return { ...item, column: col }
    })
    const columns = columnEnds.length
    for (const item of withColumn) {
      positioned.push({
        event: item.event,
        top: (item.start / 60) * ROW_HEIGHT,
        height: ((item.end - item.start) / 60) * ROW_HEIGHT,
        column: item.column,
        columns,
      })
    }
    cluster = []
  }

  for (const item of withSpan) {
    if (cluster.length > 0 && item.start >= clusterEnd) {
      flushCluster()
      clusterEnd = -1
    }
    cluster.push(item)
    clusterEnd = Math.max(clusterEnd, item.end)
  }
  flushCluster()

  return positioned
}

function formatHour(hour: number, language: string): string {
  const d = new Date(2000, 0, 1, hour, 0)
  return new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit' }).format(d)
}

interface DayViewProps {
  events: CalendarEvent[]
  language: string
  t: TFunction
  onSlotClick: (time: string) => void
  onEventClick: (ev: CalendarEvent, e: MouseEvent) => void
  canDragEvent: (ev: CalendarEvent) => boolean
}

export function DayView({ events, language, t, onSlotClick, onEventClick, canDragEvent }: DayViewProps) {
  const untimed = events.filter((ev) => !ev.start_time)
  const timed = layoutTimedEvents(events)

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto rounded-xl border border-brand-border bg-brand-dark">
      {/* Eventos sem horário — faixa fixa no topo, tipo "dia inteiro" */}
      {untimed.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-brand-border bg-white/[0.02]">
          {untimed.map((ev) => (
            <EventChip key={ev.id} event={ev} t={t} onClick={onEventClick} />
          ))}
        </div>
      )}

      {/* Grid horário */}
      <div className="relative flex" style={{ height: GRID_HEIGHT }}>
        {/* Coluna de horas */}
        <div className="w-16 flex-none border-r border-brand-border">
          {HOURS.map((h) => (
            <div
              key={h}
              className="text-[10px] text-slate-500 text-right pr-2 -translate-y-1/2"
              style={{ height: ROW_HEIGHT }}
            >
              {formatHour(h, language)}
            </div>
          ))}
        </div>

        {/* Coluna de slots + eventos */}
        <div className="relative flex-1">
          {/* Linhas de hora, clicáveis em blocos de 30min pra criar evento */}
          {HOURS.map((h) => (
            <div key={h} className="border-b border-brand-border/60" style={{ height: ROW_HEIGHT }}>
              <button
                onClick={() => onSlotClick(`${String(h).padStart(2, '0')}:00`)}
                className="w-full h-1/2 hover:bg-white/[0.03] transition-colors block"
              />
              <button
                onClick={() => onSlotClick(`${String(h).padStart(2, '0')}:30`)}
                className="w-full h-1/2 hover:bg-white/[0.03] transition-colors block border-t border-dashed border-brand-border/30"
              />
            </div>
          ))}

          {/* Eventos posicionados por horário — arrastáveis verticalmente (#597) */}
          {timed.map(({ event, top, height, column, columns }) => (
            <div
              key={event.id}
              className="absolute px-0.5"
              style={{
                top,
                height: Math.max(height, 18),
                left: `${(column / columns) * 100}%`,
                width: `${100 / columns}%`,
              }}
            >
              <EventChip
                event={event}
                t={t}
                onClick={onEventClick}
                draggable={canDragEvent(event)}
                className="w-full"
                style={{ height: '100%' }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
