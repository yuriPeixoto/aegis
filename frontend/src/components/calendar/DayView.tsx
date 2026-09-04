import type { TFunction } from 'i18next'
import type { MouseEvent } from 'react'
import type { CalendarEvent } from '../../types/calendar'
import type { CalendarReference } from '../../hooks/useSlaSettings'
import { EventChip } from './EventChip'
import { toMinutes } from './time'
import { GRID_HEIGHT, HOURS, ROW_HEIGHT, formatHour, isoWeekday, layoutTimedEvents } from './dayGridUtils'

export { ROW_HEIGHT }

interface DayViewProps {
  date: string
  events: CalendarEvent[]
  language: string
  t: TFunction
  onSlotClick: (time: string) => void
  onEventClick: (ev: CalendarEvent, e: MouseEvent) => void
  canDragEvent: (ev: CalendarEvent) => boolean
  calendarReference?: CalendarReference
}

export function DayView({
  date, events, language, t, onSlotClick, onEventClick, canDragEvent, calendarReference,
}: DayViewProps) {
  const untimed = events.filter((ev) => !ev.start_time)
  const timed = layoutTimedEvents(events)

  const holiday = calendarReference?.holidays.find((h) => h.date === date)
  const businessHours = calendarReference?.business_hours
  const isWorkDay = businessHours ? businessHours.work_days.includes(isoWeekday(date)) : true
  const isDayOff = !!holiday || !isWorkDay

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto rounded-xl border border-brand-border bg-brand-dark">
      {/* Fora do expediente / feriado (#600) — referência visual, não bloqueia nada */}
      {isDayOff && (
        <div className="px-3 py-2 border-b border-brand-border bg-slate-500/10 text-xs text-slate-400">
          {holiday ? t('calendar.dayOff.holiday', { description: holiday.description }) : t('calendar.dayOff.weekend')}
        </div>
      )}

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
                    style={{
                      top: (toMinutes(businessHours.work_end) / 60) * ROW_HEIGHT,
                      bottom: 0,
                    }}
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
            <div key={h} className="relative border-b border-brand-border/60" style={{ height: ROW_HEIGHT }}>
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
