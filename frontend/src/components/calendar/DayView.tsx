import type { TFunction } from 'i18next'
import type { CalendarEvent, CalendarEventType } from '../../types/calendar'
import { DOT_COLORS, EVENT_COLORS, eventLabel, taskDisplayColor } from './colors'

const HOURS = Array.from({ length: 24 }, (_, h) => h)
const ROW_HEIGHT = 56 // px por hora
const GRID_HEIGHT = HOURS.length * ROW_HEIGHT

interface PositionedEvent {
  event: CalendarEvent
  top: number
  height: number
  column: number
  columns: number
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
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
  onEventClick: (ev: CalendarEvent, e: React.MouseEvent) => void
}

export function DayView({ events, language, t, onSlotClick, onEventClick }: DayViewProps) {
  const untimed = events.filter((ev) => !ev.start_time)
  const timed = layoutTimedEvents(events)

  function renderEventChip(ev: CalendarEvent, style?: React.CSSProperties, className?: string) {
    const isTask = ev.type === 'task'
    const taskColor = isTask ? taskDisplayColor(ev) : null
    return (
      <button
        key={ev.id}
        onClick={(e) => onEventClick(ev, e)}
        className={`text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate overflow-hidden ${
          isTask ? 'border' : EVENT_COLORS[ev.type as CalendarEventType]
        } ${className ?? ''}`}
        style={{
          ...(taskColor
            ? { backgroundColor: `${taskColor}33`, color: taskColor, borderColor: `${taskColor}66` }
            : {}),
          ...style,
        }}
      >
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${!isTask ? DOT_COLORS[ev.type as CalendarEventType] : ''}`}
          style={taskColor ? { backgroundColor: taskColor } : undefined}
        />
        {eventLabel(ev, t)}
      </button>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto rounded-xl border border-brand-border bg-brand-dark">
      {/* Eventos sem horário — faixa fixa no topo, tipo "dia inteiro" */}
      {untimed.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-brand-border bg-white/[0.02]">
          {untimed.map((ev) => renderEventChip(ev))}
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

          {/* Eventos posicionados por horário */}
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
              {renderEventChip(event, { height: '100%' }, 'w-full')}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
