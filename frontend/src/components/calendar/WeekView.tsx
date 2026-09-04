import { useDroppable } from '@dnd-kit/core'
import type { TFunction } from 'i18next'
import type { MouseEvent } from 'react'
import type { CalendarEvent } from '../../types/calendar'
import type { CalendarReference } from '../../hooks/useSlaSettings'
import { EventChip } from './EventChip'
import { toMinutes } from './time'
import { GRID_HEIGHT, HOURS, ROW_HEIGHT, formatHour, isoWeekday, layoutTimedEvents } from './dayGridUtils'

interface WeekViewProps {
  weekDates: string[] // 7 datas "YYYY-MM-DD", domingo a sábado
  todayStr: string
  events: CalendarEvent[]
  language: string
  t: TFunction
  onSlotClick: (date: string, time: string) => void
  onEventClick: (ev: CalendarEvent, e: MouseEvent) => void
  canDragEvent: (ev: CalendarEvent) => boolean
  calendarReference?: CalendarReference
}

function dayLabel(dateStr: string, language: string): { weekday: string; day: number } {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return {
    weekday: new Intl.DateTimeFormat(language, { weekday: 'short' }).format(date),
    day: d,
  }
}

// Coluna de um dia — alvo de drop (#608, mesmo id scheme "day:<data>" do
// grid mensal) pra dnd-kit saber pra qual dia um evento foi arrastado.
function WeekDayColumn({
  date, dayEvents, t, onSlotClick, onEventClick, canDragEvent, businessHours, isDayOff,
}: {
  date: string
  dayEvents: CalendarEvent[]
  t: TFunction
  onSlotClick: (time: string) => void
  onEventClick: (ev: CalendarEvent, e: MouseEvent) => void
  canDragEvent: (ev: CalendarEvent) => boolean
  businessHours?: CalendarReference['business_hours']
  isDayOff: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${date}` })
  const timed = layoutTimedEvents(dayEvents)

  return (
    <div ref={setNodeRef} className={`relative flex-1 border-r border-brand-border/60 last:border-r-0 ${isOver ? 'bg-brand-accent/10' : ''}`}>
      {/* Fora do expediente / almoço — referência visual (#600) */}
      {businessHours && (
        <div className="absolute inset-0 pointer-events-none z-0">
          {isDayOff ? (
            <div className="absolute inset-0 bg-black/25" />
          ) : (
            <>
              <div
                className="absolute left-0 right-0 top-0 bg-black/25"
                style={{ height: (toMinutes(businessHours.work_start) / 60) * ROW_HEIGHT }}
              />
              <div
                className="absolute left-0 right-0 bg-black/25"
                style={{ top: (toMinutes(businessHours.work_end) / 60) * ROW_HEIGHT, bottom: 0 }}
              />
              {businessHours.lunch_start && businessHours.lunch_end && (
                <div
                  className="absolute left-0 right-0 bg-amber-500/10 border-y border-amber-500/20"
                  style={{
                    top: (toMinutes(businessHours.lunch_start) / 60) * ROW_HEIGHT,
                    height:
                      ((toMinutes(businessHours.lunch_end) - toMinutes(businessHours.lunch_start)) / 60) *
                      ROW_HEIGHT,
                  }}
                />
              )}
            </>
          )}
        </div>
      )}

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

      {/* Eventos posicionados por horário — arrastáveis (#597/#608: vertical=horário, horizontal=dia) */}
      {timed.map(({ event, top, height, column, columns }) => (
        <div
          key={event.id}
          className="absolute px-0.5"
          style={{
            top,
            height: Math.max(height, 16),
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
            style={{ height: '100%', fontSize: '10px' }}
          />
        </div>
      ))}
    </div>
  )
}

export function WeekView({
  weekDates, todayStr, events, language, t, onSlotClick, onEventClick, canDragEvent, calendarReference,
}: WeekViewProps) {
  const eventsByDate = events.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
    ;(acc[ev.event_date] ??= []).push(ev)
    return acc
  }, {})

  const businessHours = calendarReference?.business_hours

  return (
    <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-brand-border bg-brand-dark overflow-hidden">
      {/* Cabeçalho dos dias */}
      <div className="flex border-b border-brand-border">
        <div className="w-16 flex-none" />
        {weekDates.map((date) => {
          const { weekday, day } = dayLabel(date, language)
          const isToday = date === todayStr
          return (
            <div key={date} className="flex-1 text-center py-2 border-r border-brand-border/60 last:border-r-0">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">{weekday}</div>
              <div
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mt-0.5 ${
                  isToday ? 'bg-brand-accent text-white' : 'text-slate-300'
                }`}
              >
                {day}
              </div>
            </div>
          )
        })}
      </div>

      {/* Eventos sem horário — uma faixa por dia, alinhada nas colunas */}
      {events.some((ev) => !ev.start_time) && (
        <div className="flex border-b border-brand-border bg-white/[0.02]">
          <div className="w-16 flex-none" />
          {weekDates.map((date) => (
            <div key={date} className="flex-1 flex flex-col gap-0.5 p-1 border-r border-brand-border/60 last:border-r-0 min-w-0">
              {(eventsByDate[date] ?? []).filter((ev) => !ev.start_time).map((ev) => (
                <EventChip key={ev.id} event={ev} t={t} onClick={onEventClick} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Grid horário */}
      <div className="relative flex flex-1 min-h-0 overflow-y-auto">
        <div style={{ height: GRID_HEIGHT }} className="flex flex-1">
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

          {weekDates.map((date) => {
            const holiday = calendarReference?.holidays.find((h) => h.date === date)
            const isWorkDay = businessHours ? businessHours.work_days.includes(isoWeekday(date)) : true
            const isDayOff = !!holiday || !isWorkDay
            return (
              <WeekDayColumn
                key={date}
                date={date}
                dayEvents={(eventsByDate[date] ?? []).filter((ev) => ev.start_time)}
                t={t}
                onSlotClick={(time) => onSlotClick(date, time)}
                onEventClick={onEventClick}
                canDragEvent={canDragEvent}
                businessHours={businessHours}
                isDayOff={isDayOff}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
