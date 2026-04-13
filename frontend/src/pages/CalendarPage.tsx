import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react'
import { useMe } from '../hooks/useAuth'
import { useAllUsers } from '../hooks/useUsers'
import { useSources } from '../hooks/useSources'
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
} from '../hooks/useCalendar'
import type { CalendarEvent, CalendarEventCreate, CalendarEventUpdate, CalendarEventType } from '../types/calendar'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const total = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= total; d++) days.push(new Date(year, month, d))
  return days
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}


const EVENT_COLORS: Record<CalendarEventType, string> = {
  on_call:  'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
  training: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
}

const DOT_COLORS: Record<CalendarEventType, string> = {
  on_call:  'bg-indigo-400',
  training: 'bg-emerald-400',
}

// ── Event Modal ───────────────────────────────────────────────────────────────

interface ModalProps {
  event?: CalendarEvent | null
  initialDate?: string
  onClose: () => void
  isAdmin: boolean
  currentUserId: number
}

function EventModal({ event, initialDate, onClose, isAdmin, currentUserId }: ModalProps) {
  const { t } = useTranslation()
  const { data: users = [] } = useAllUsers()
  const { data: sourcesData } = useSources()
  const sources = sourcesData ?? []

  const createMut = useCreateCalendarEvent()
  const updateMut = useUpdateCalendarEvent(event?.id ?? 0)
  const deleteMut = useDeleteCalendarEvent()

  const isNew = !event
  const [type, setType] = useState<CalendarEventType>(event?.type ?? 'on_call')
  const [agentId, setAgentId] = useState<number>(event?.agent_id ?? currentUserId)
  const [eventDate, setEventDate] = useState(event?.event_date ?? initialDate ?? '')
  const [startTime, setStartTime] = useState(event?.start_time ?? '')
  const [endTime, setEndTime] = useState(event?.end_time ?? '')
  const [sourceId, setSourceId] = useState<number | ''>(event?.source_id ?? '')
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [error, setError] = useState('')

  const canEditOnCall = isAdmin
  const canEditTraining = isAdmin || (event?.agent_id === currentUserId)
  const canEdit = event ? (event.type === 'on_call' ? canEditOnCall : canEditTraining) : true
  const canDelete = canEdit

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      if (isNew) {
        const payload: CalendarEventCreate = {
          type,
          agent_id: agentId,
          event_date: eventDate,
          start_time: startTime || null,
          end_time: endTime || null,
          source_id: type === 'training' ? (sourceId !== '' ? Number(sourceId) : null) : null,
          notes: notes || null,
        }
        await createMut.mutateAsync(payload)
      } else {
        const payload: CalendarEventUpdate = {
          agent_id: agentId,
          event_date: eventDate,
          start_time: startTime || null,
          end_time: endTime || null,
          source_id: type === 'training' ? (sourceId !== '' ? Number(sourceId) : null) : null,
          notes: notes || null,
        }
        await updateMut.mutateAsync(payload)
      }
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? t('calendar.modal.error_generic'))
    }
  }

  async function handleDelete() {
    if (!event) return
    try {
      await deleteMut.mutateAsync(event.id)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? t('calendar.modal.error_generic'))
    }
  }

  const isBusy = createMut.isPending || updateMut.isPending || deleteMut.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-brand-dark border border-brand-border rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
          <h2 className="text-sm font-semibold text-slate-100">
            {isNew ? t('calendar.modal.title_new') : t('calendar.modal.title_edit')}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Tipo — só ao criar */}
          {isNew && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('calendar.modal.type')}</label>
              <div className="flex gap-2">
                {(['on_call', 'training'] as CalendarEventType[]).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => {
                      if (tp === 'on_call' && !isAdmin) return
                      setType(tp)
                    }}
                    disabled={tp === 'on_call' && !isAdmin}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors
                      ${type === tp
                        ? tp === 'on_call'
                          ? 'bg-indigo-500/30 border-indigo-500 text-indigo-300'
                          : 'bg-emerald-500/30 border-emerald-500 text-emerald-300'
                        : 'border-brand-border text-slate-400 hover:text-slate-200'
                      }
                      ${tp === 'on_call' && !isAdmin ? 'opacity-40 cursor-not-allowed' : ''}
                    `}
                  >
                    {t(`calendar.type.${tp}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Agent */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('calendar.modal.agent')}</label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(Number(e.target.value))}
              disabled={!isAdmin}
              className="w-full bg-brand-surface border border-brand-border rounded-md px-3 py-2 text-sm text-slate-200 disabled:opacity-50"
            >
              {users.filter((u) => u.is_active && u.role !== 'viewer').map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Data */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('calendar.modal.date')}</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
              disabled={!canEdit}
              className="w-full bg-brand-surface border border-brand-border rounded-md px-3 py-2 text-sm text-slate-200 disabled:opacity-50"
            />
          </div>

          {/* Horário */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">{t('calendar.modal.start_time')}</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={!canEdit}
                className="w-full bg-brand-surface border border-brand-border rounded-md px-3 py-2 text-sm text-slate-200 disabled:opacity-50"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">{t('calendar.modal.end_time')}</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={!canEdit}
                className="w-full bg-brand-surface border border-brand-border rounded-md px-3 py-2 text-sm text-slate-200 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Cliente — só para training */}
          {type === 'training' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('calendar.modal.client')}</label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value === '' ? '' : Number(e.target.value))}
                required={type === 'training'}
                disabled={!canEdit}
                className="w-full bg-brand-surface border border-brand-border rounded-md px-3 py-2 text-sm text-slate-200 disabled:opacity-50"
              >
                <option value="">{t('calendar.modal.select_client')}</option>
                {sources.filter((s) => s.is_active).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('calendar.modal.notes')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canEdit}
              rows={2}
              placeholder={t('calendar.modal.notes_placeholder')}
              className="w-full bg-brand-surface border border-brand-border rounded-md px-3 py-2 text-sm text-slate-200 resize-none placeholder-slate-600 disabled:opacity-50"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Ações */}
          <div className="flex items-center justify-between pt-1">
            <div>
              {!isNew && canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('calendar.modal.delete')}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
              {canEdit && (
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-1.5 bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                >
                  {isBusy ? t('common.saving') : isNew ? t('common.create') : t('common.save')}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── CalendarPage ───────────────────────────────────────────────────────────────

export function CalendarPage() {
  const { t, i18n } = useTranslation()
  const { data: me } = useMe()
  const isAdmin = me?.role === 'admin'

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed

  const { data: events = [], isLoading } = useCalendarEvents({ year, month: month + 1 })

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Mapa: "YYYY-MM-DD" → CalendarEvent[]
  const eventsByDate = events.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
    if (!acc[ev.event_date]) acc[ev.event_date] = []
    acc[ev.event_date].push(ev)
    return acc
  }, {})

  const days = getDaysInMonth(year, month)
  const firstDayOfWeek = new Date(year, month, 1).getDay() // 0 = Sun
  const paddingDays = firstDayOfWeek // células vazias no início

  const monthLabel = new Date(year, month, 1).toLocaleDateString(i18n.language, {
    month: 'long', year: 'numeric',
  })

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  function openNewEvent(dateStr: string) {
    setSelectedDate(dateStr)
    setSelectedEvent(null)
    setModalOpen(true)
  }

  function openEditEvent(ev: CalendarEvent, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedEvent(ev)
    setSelectedDate(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setSelectedDate(null)
    setSelectedEvent(null)
  }

  const todayStr = toDateStr(today)

  const WEEKDAYS = [
    t('calendar.weekday.sun'),
    t('calendar.weekday.mon'),
    t('calendar.weekday.tue'),
    t('calendar.weekday.wed'),
    t('calendar.weekday.thu'),
    t('calendar.weekday.fri'),
    t('calendar.weekday.sat'),
  ]

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">{t('calendar.title')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('calendar.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Legenda */}
          <div className="flex items-center gap-3 mr-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
              {t('calendar.type.on_call')}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              {t('calendar.type.training')}
            </span>
          </div>
          {/* Navegação mês */}
          <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-slate-200 capitalize w-36 text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          {t('common.loading')}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Cabeçalho dias da semana */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold text-center py-1">
                {wd}
              </div>
            ))}
          </div>

          {/* Células */}
          <div className="grid grid-cols-7 gap-px bg-brand-border flex-1 rounded-xl overflow-hidden border border-brand-border">
            {/* Padding inicial */}
            {Array.from({ length: paddingDays }).map((_, i) => (
              <div key={`pad-${i}`} className="bg-brand-dark/50 min-h-[100px]" />
            ))}

            {days.map((day) => {
              const dateStr = toDateStr(day)
              const dayEvents = eventsByDate[dateStr] ?? []
              const isToday = dateStr === todayStr
              const isSat = day.getDay() === 6
              const isSun = day.getDay() === 0

              return (
                <div
                  key={dateStr}
                  onClick={() => openNewEvent(dateStr)}
                  className={`bg-brand-dark p-2 min-h-[100px] cursor-pointer group transition-colors hover:bg-white/[0.02] flex flex-col
                    ${isSat || isSun ? 'bg-white/[0.015]' : ''}
                  `}
                >
                  {/* Número do dia */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                        ${isToday ? 'bg-brand-accent text-white' : isSat ? 'text-indigo-400' : isSun ? 'text-slate-400' : 'text-slate-400'}
                      `}
                    >
                      {day.getDate()}
                    </span>
                    {/* Botão + só aparece no hover */}
                    <button
                      onClick={(e) => { e.stopPropagation(); openNewEvent(dateStr) }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-slate-500 hover:text-slate-200"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Eventos do dia */}
                  <div className="flex flex-col gap-0.5 flex-1">
                    {dayEvents.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={(e) => openEditEvent(ev, e)}
                        className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate ${EVENT_COLORS[ev.type as CalendarEventType]}`}
                      >
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${DOT_COLORS[ev.type as CalendarEventType]}`} />
                        {ev.type === 'on_call'
                          ? ev.agent.name
                          : ev.source?.name ?? ev.agent.name
                        }
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && me && (
        <EventModal
          event={selectedEvent}
          initialDate={selectedDate ?? undefined}
          onClose={closeModal}
          isAdmin={isAdmin}
          currentUserId={me.id}
        />
      )}
    </div>
  )
}
