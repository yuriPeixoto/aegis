import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Plus, X, Trash2, GraduationCap } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useMe } from '../hooks/useAuth'
import { useCalendarReference } from '../hooks/useSlaSettings'
import { useAllUsers } from '../hooks/useUsers'
import { useSources } from '../hooks/useSources'
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useCreateRecurringCalendarEvents,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
  useRescheduleCalendarEvent,
} from '../hooks/useCalendar'
import type {
  CalendarEvent,
  CalendarEventCreate,
  CalendarEventUpdate,
  CalendarEventType,
  RecurrenceRule,
} from '../types/calendar'
import { DayView, ROW_HEIGHT } from '../components/calendar/DayView'
import { WeekView } from '../components/calendar/WeekView'
import { DEFAULT_TASK_COLOR } from '../components/calendar/colors'
import { canEditEvent } from '../components/calendar/permissions'
import { EventChip } from '../components/calendar/EventChip'
import { MonthDayCell } from '../components/calendar/MonthDayCell'
import { toMinutes, fromMinutes, clampMinutes } from '../components/calendar/time'

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

function parseDateStr(dateStr: string): { year: number; month: number } {
  const [year, month] = dateStr.split('-').map(Number)
  return { year, month: month - 1 }
}

function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return toDateStr(new Date(y, m - 1, d + delta))
}

// 7 datas (domingo a sábado) da semana que contém dateStr
function getWeekDates(dateStr: string): string[] {
  const [y, m, d] = dateStr.split('-').map(Number)
  const weekday = new Date(y, m - 1, d).getDay() // 0=domingo .. 6=sábado
  const sunday = addDays(dateStr, -weekday)
  return Array.from({ length: 7 }, (_, i) => addDays(sunday, i))
}

// ── Event Modal ───────────────────────────────────────────────────────────────

interface ModalProps {
  event?: CalendarEvent | null
  initialDate?: string
  initialTime?: string
  onClose: () => void
  isAdmin: boolean
  currentUserId: number
}

function EventModal({ event, initialDate, initialTime, onClose, isAdmin, currentUserId }: ModalProps) {
  const { t, i18n } = useTranslation()
  const { data: users = [] } = useAllUsers()
  const { data: sourcesData } = useSources()
  const sources = sourcesData ?? []

  const createMut = useCreateCalendarEvent()
  const createRecurringMut = useCreateRecurringCalendarEvents()
  const updateMut = useUpdateCalendarEvent(event?.id ?? 0)
  const deleteMut = useDeleteCalendarEvent()

  const isNew = !event
  const [type, setType] = useState<CalendarEventType>(event?.type ?? 'on_call')
  const [title, setTitle] = useState(event?.title ?? '')
  const [agentId, setAgentId] = useState<number>(event?.agent_id ?? currentUserId)
  const [eventDate, setEventDate] = useState(event?.event_date ?? initialDate ?? '')
  const [startTime, setStartTime] = useState(event?.start_time ?? initialTime ?? '')
  const [endTime, setEndTime] = useState(event?.end_time ?? '')
  const [sourceId, setSourceId] = useState<number | ''>(event?.source_id ?? '')
  const [color, setColor] = useState(event?.color ?? DEFAULT_TASK_COLOR)
  const [prNumber, setPrNumber] = useState(event?.pr_number ?? '')
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [error, setError] = useState('')

  // Recorrência — só faz sentido ao criar uma tarefa nova (#599, baixa prioridade)
  const [repeatEnabled, setRepeatEnabled] = useState(false)
  const [repeatFreq, setRepeatFreq] = useState<RecurrenceRule['freq']>('weekly')
  const [repeatInterval, setRepeatInterval] = useState(1)
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([])
  const [repeatUntil, setRepeatUntil] = useState('')

  // Cor da tag do ticket vinculado, se houver — tem prioridade sobre a cor manual
  const inheritedColor = event?.ticket?.tags[0]?.color ?? null

  const canEdit = event ? canEditEvent(event, isAdmin, currentUserId) : true
  const canDelete = canEdit

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      if (isNew) {
        const payload: CalendarEventCreate = {
          type,
          title: type === 'task' ? title : null,
          agent_id: agentId,
          event_date: eventDate,
          start_time: startTime || null,
          end_time: endTime || null,
          source_id: type === 'training' ? (sourceId !== '' ? Number(sourceId) : null) : null,
          color: type === 'task' ? color : null,
          notes: notes || null,
        }
        if (type === 'task' && repeatEnabled) {
          payload.recurrence = {
            freq: repeatFreq,
            interval: repeatInterval,
            byweekday: repeatFreq === 'weekly' && repeatWeekdays.length > 0 ? repeatWeekdays : null,
            until: repeatUntil || null,
          }
          await createRecurringMut.mutateAsync(payload)
        } else {
          await createMut.mutateAsync(payload)
        }
      } else {
        const payload: CalendarEventUpdate = {
          title: type === 'task' ? title : undefined,
          agent_id: agentId,
          event_date: eventDate,
          start_time: startTime || null,
          end_time: endTime || null,
          source_id: type === 'training' ? (sourceId !== '' ? Number(sourceId) : null) : null,
          color: type === 'task' ? color : undefined,
          pr_number: type === 'task' && event?.ticket ? (prNumber || null) : undefined,
          notes: notes || null,
        }
        await updateMut.mutateAsync(payload)
      }
      onClose()
    } catch (err: unknown) {
      const detail = isAxiosError<{ detail?: string }>(err) ? err.response?.data?.detail : undefined
      setError(detail ?? t('calendar.modal.error_generic'))
    }
  }

  async function handleDelete() {
    if (!event) return
    try {
      await deleteMut.mutateAsync(event.id)
      onClose()
    } catch (err: unknown) {
      const detail = isAxiosError<{ detail?: string }>(err) ? err.response?.data?.detail : undefined
      setError(detail ?? t('calendar.modal.error_generic'))
    }
  }

  const isBusy =
    createMut.isPending || createRecurringMut.isPending || updateMut.isPending || deleteMut.isPending

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
                {(['task', 'on_call', 'training'] as CalendarEventType[]).map((tp) => (
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
                          : tp === 'training'
                            ? 'bg-emerald-500/30 border-emerald-500 text-emerald-300'
                            : 'bg-sky-500/30 border-sky-500 text-sky-300'
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

          {/* Título — só para tarefa */}
          {type === 'task' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('calendar.modal.taskTitle')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={!canEdit}
                placeholder={t('calendar.modal.taskTitlePlaceholder')}
                className="w-full bg-brand-surface border border-brand-border rounded-md px-3 py-2 text-sm text-slate-200 placeholder-slate-600 disabled:opacity-50"
              />
            </div>
          )}

          {/* Cor — só para tarefa; se o ticket vinculado já tem tag, a cor vem de lá */}
          {type === 'task' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('calendar.modal.taskColor')}</label>
              {inheritedColor ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span
                    className="w-4 h-4 rounded border border-brand-border inline-block"
                    style={{ backgroundColor: inheritedColor }}
                  />
                  {t('calendar.modal.taskColorInherited')}
                </div>
              ) : (
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  disabled={!canEdit}
                  className="h-8 w-16 bg-brand-surface border border-brand-border rounded-md disabled:opacity-50"
                />
              )}
            </div>
          )}

          {/* Repetir — só ao criar uma tarefa nova (#599, baixa prioridade) */}
          {isNew && type === 'task' && (
            <div className="rounded-md border border-brand-border bg-brand-surface/50 px-3 py-2 space-y-3">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={repeatEnabled}
                  onChange={(e) => setRepeatEnabled(e.target.checked)}
                  className="rounded border-brand-border"
                />
                {t('calendar.modal.repeat')}
              </label>

              {repeatEnabled && (
                <div className="space-y-3 pl-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{t('calendar.modal.repeatEvery')}</span>
                    <input
                      type="number"
                      min={1}
                      max={52}
                      value={repeatInterval}
                      onChange={(e) => setRepeatInterval(Math.max(1, Number(e.target.value)))}
                      className="w-14 bg-brand-surface border border-brand-border rounded-md px-2 py-1 text-sm text-slate-200"
                    />
                    <select
                      value={repeatFreq}
                      onChange={(e) => setRepeatFreq(e.target.value as RecurrenceRule['freq'])}
                      className="flex-1 bg-brand-surface border border-brand-border rounded-md px-2 py-1 text-sm text-slate-200"
                    >
                      <option value="daily">{t('calendar.modal.repeatFreq.daily')}</option>
                      <option value="weekly">{t('calendar.modal.repeatFreq.weekly')}</option>
                      <option value="monthly">{t('calendar.modal.repeatFreq.monthly')}</option>
                    </select>
                  </div>

                  {repeatFreq === 'weekly' && (
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4, 5, 6].map((wd) => (
                        <button
                          key={wd}
                          type="button"
                          onClick={() =>
                            setRepeatWeekdays((prev) =>
                              prev.includes(wd) ? prev.filter((d) => d !== wd) : [...prev, wd]
                            )
                          }
                          className={`w-7 h-7 rounded-full text-[10px] font-medium transition-colors ${
                            repeatWeekdays.includes(wd)
                              ? 'bg-brand-accent text-white'
                              : 'bg-brand-surface border border-brand-border text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {t(`calendar.weekday.${['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][wd]}`).slice(0, 1)}
                        </button>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">{t('calendar.modal.repeatUntil')}</label>
                    <input
                      type="date"
                      value={repeatUntil}
                      onChange={(e) => setRepeatUntil(e.target.value)}
                      min={eventDate}
                      className="w-full bg-brand-surface border border-brand-border rounded-md px-3 py-2 text-sm text-slate-200"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">{t('calendar.modal.repeatUntilHint')}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conclusão + PR — só tarefa vinculada a ticket (fechamento do #1250) */}
          {type === 'task' && event?.ticket && (
            <div className="rounded-md border border-brand-border bg-brand-surface/50 px-3 py-2 space-y-2">
              {event.completed_at ? (
                <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                  {t('calendar.modal.completedAt', {
                    when: new Date(event.completed_at).toLocaleString(i18n.language, {
                      dateStyle: 'short', timeStyle: 'short',
                    }),
                  })}
                </p>
              ) : (
                <p className="text-xs text-slate-500">{t('calendar.modal.notCompletedYet')}</p>
              )}
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('calendar.modal.prNumber')}</label>
                <input
                  type="text"
                  value={prNumber}
                  onChange={(e) => setPrNumber(e.target.value)}
                  disabled={!canEdit}
                  placeholder={t('calendar.modal.prPlaceholder')}
                  className="w-full bg-brand-surface border border-brand-border rounded-md px-3 py-2 text-sm text-slate-200 placeholder-slate-600 disabled:opacity-50"
                />
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

          {/* Comprovante de treinamento — só para training já salvo */}
          {type === 'training' && !isNew && event && (
            <Link
              to={`/treinamentos/novo?calendar_event_id=${event.id}${sourceId ? `&source_id=${sourceId}` : ''}`}
              className="flex items-center gap-1.5 text-xs text-brand-purple hover:text-brand-neon transition-colors"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              {t('calendar.modal.trainingRecordLink')}
            </Link>
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
  const { data: calendarReference } = useCalendarReference()

  const today = new Date()
  const todayStr = toDateStr(today)

  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed
  const [dayDate, setDayDate] = useState(todayStr)

  // Semana que contém dayDate (domingo a sábado) — usada pelo modo 'week'
  const weekDates = getWeekDates(dayDate)

  // No modo dia/semana, busca a partir de dayDate (pode ter cruzado pra
  // outro mês via navegação). Semana usa from_date (sem upper bound —
  // volume é baixo) e filtra no cliente pro intervalo exato da semana.
  const queryFilters =
    viewMode === 'week'
      ? { from_date: weekDates[0] }
      : viewMode === 'day'
        ? { year: parseDateStr(dayDate).year, month: parseDateStr(dayDate).month + 1 }
        : { year, month: month + 1 }
  const { data: rawEvents = [], isLoading } = useCalendarEvents(queryFilters)
  const events =
    viewMode === 'week'
      ? rawEvents.filter((ev) => ev.event_date >= weekDates[0] && ev.event_date <= weekDates[6])
      : rawEvents

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Drag-and-drop (#597) — arrastar entre dias no mês, ou entre horários no dia
  const rescheduleMut = useRescheduleCalendarEvent()
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function canDragEvent(ev: CalendarEvent): boolean {
    // Tarefa concluída é registro de fato (hora do fechamento) — não se arrasta
    if (ev.completed_at) return false
    return !!me && canEditEvent(ev, isAdmin, me.id)
  }

  function eventFromDragId(id: string): CalendarEvent | undefined {
    const evId = Number(id.slice('event:'.length))
    return events.find((ev) => ev.id === evId)
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveDragId(e.active.id as string)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveDragId(null)
    const activeIdStr = e.active.id as string
    const ev = eventFromDragId(activeIdStr)
    if (!ev) return

    function reportError(err: unknown) {
      const detail = isAxiosError<{ detail?: string }>(err) ? err.response?.data?.detail : undefined
      toast.error(detail ?? t('calendar.modal.error_generic'))
    }

    if (viewMode === 'day' || viewMode === 'week') {
      // Vertical reagenda o horário (mantém a duração); na semana, soltar
      // numa coluna de outro dia (#608) também muda a data
      if (!ev.start_time) return
      const deltaMinutes = Math.round(((e.delta.y / ROW_HEIGHT) * 60) / 15) * 15

      let newDate = ev.event_date
      if (viewMode === 'week') {
        const overIdStr = e.over?.id as string | undefined
        if (overIdStr?.startsWith('day:')) newDate = overIdStr.slice('day:'.length)
      }

      if (deltaMinutes === 0 && newDate === ev.event_date) return

      const newStartMin = clampMinutes(toMinutes(ev.start_time) + deltaMinutes)
      const payload: CalendarEventUpdate = { start_time: fromMinutes(newStartMin) }
      if (ev.end_time) {
        const duration = toMinutes(ev.end_time) - toMinutes(ev.start_time)
        payload.end_time = fromMinutes(clampMinutes(newStartMin + duration))
      }
      if (newDate !== ev.event_date) payload.event_date = newDate
      rescheduleMut.mutate({ id: ev.id, payload }, { onError: reportError })
      return
    }

    // Modo mês: soltar sobre outra célula reagenda a data (horário intacto)
    const overIdStr = e.over?.id as string | undefined
    if (!overIdStr?.startsWith('day:')) return
    const newDate = overIdStr.slice('day:'.length)
    if (newDate === ev.event_date) return
    rescheduleMut.mutate({ id: ev.id, payload: { event_date: newDate } }, { onError: reportError })
  }

  const activeDragEvent = activeDragId ? eventFromDragId(activeDragId) : undefined

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

  function openNewEvent(dateStr: string, time?: string) {
    setSelectedDate(dateStr)
    setSelectedTime(time ?? null)
    setSelectedEvent(null)
    setModalOpen(true)
  }

  function openEditEvent(ev: CalendarEvent, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedEvent(ev)
    setSelectedDate(null)
    setSelectedTime(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setSelectedDate(null)
    setSelectedTime(null)
    setSelectedEvent(null)
  }

  function openDayView(dateStr: string) {
    setDayDate(dateStr)
    setViewMode('day')
  }

  function prevDay() {
    setDayDate((d) => addDays(d, -1))
  }

  function nextDay() {
    setDayDate((d) => addDays(d, 1))
  }

  function prevWeek() {
    setDayDate((d) => addDays(d, -7))
  }

  function nextWeek() {
    setDayDate((d) => addDays(d, 7))
  }

  const selectedDayEvents = events.filter((ev) => ev.event_date === dayDate)

  const dayLabel = (() => {
    const { year: y, month: m } = parseDateStr(dayDate)
    const d = Number(dayDate.split('-')[2])
    return new Date(y, m, d).toLocaleDateString(i18n.language, {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  })()

  const weekLabel = (() => {
    const fmtShort = (dateStr: string) => {
      const { year: y, month: m } = parseDateStr(dateStr)
      const d = Number(dateStr.split('-')[2])
      return new Date(y, m, d).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })
    }
    return `${fmtShort(weekDates[0])} – ${fmtShort(weekDates[6])}`
  })()

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
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              {t('calendar.type.deployment')}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
              {t('calendar.type.task')}
            </span>
          </div>
          {/* Alternar Mês / Dia */}
          <div className="flex items-center rounded-md border border-brand-border overflow-hidden mr-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === 'month' ? 'bg-brand-accent text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('calendar.view.month')}
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === 'week' ? 'bg-brand-accent text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('calendar.view.week')}
            </button>
            <button
              onClick={() => openDayView(viewMode === 'day' ? dayDate : todayStr)}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === 'day' ? 'bg-brand-accent text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('calendar.view.day')}
            </button>
          </div>

          {/* Navegação */}
          {viewMode === 'month' ? (
            <>
              <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-200 capitalize w-36 text-center">{monthLabel}</span>
              <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : viewMode === 'week' ? (
            <>
              <button onClick={prevWeek} className="p-1.5 rounded-md hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-200 capitalize w-40 text-center truncate">{weekLabel}</span>
              <button onClick={nextWeek} className="p-1.5 rounded-md hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              {!weekDates.includes(todayStr) && (
                <button
                  onClick={() => setDayDate(todayStr)}
                  className="ml-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 border border-brand-border rounded-md transition-colors"
                >
                  {t('calendar.today')}
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={prevDay} className="p-1.5 rounded-md hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-200 capitalize w-56 text-center truncate">{dayLabel}</span>
              <button onClick={nextDay} className="p-1.5 rounded-md hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              {dayDate !== todayStr && (
                <button
                  onClick={() => setDayDate(todayStr)}
                  className="ml-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 border border-brand-border rounded-md transition-colors"
                >
                  {t('calendar.today')}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          {t('common.loading')}
        </div>
      ) : viewMode === 'day' ? (
        <DayView
          date={dayDate}
          events={selectedDayEvents}
          language={i18n.language}
          t={t}
          onSlotClick={(time) => openNewEvent(dayDate, time)}
          onEventClick={openEditEvent}
          canDragEvent={canDragEvent}
          calendarReference={calendarReference}
        />
      ) : viewMode === 'week' ? (
        <WeekView
          weekDates={weekDates}
          todayStr={todayStr}
          events={events}
          language={i18n.language}
          t={t}
          onSlotClick={(date, time) => openNewEvent(date, time)}
          onEventClick={openEditEvent}
          canDragEvent={canDragEvent}
          calendarReference={calendarReference}
        />
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
                <MonthDayCell
                  key={dateStr}
                  dateStr={dateStr}
                  onClick={() => openDayView(dateStr)}
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
                      <EventChip
                        key={ev.id}
                        event={ev}
                        t={t}
                        onClick={openEditEvent}
                        draggable={canDragEvent(ev)}
                        className="w-full"
                      />
                    ))}
                  </div>
                </MonthDayCell>
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
          initialTime={selectedTime ?? undefined}
          onClose={closeModal}
          isAdmin={isAdmin}
          currentUserId={me.id}
        />
      )}
    </div>
    <DragOverlay>
      {activeDragEvent ? (
        <EventChip event={activeDragEvent} t={t} onClick={() => {}} className="shadow-lg" />
      ) : null}
    </DragOverlay>
    </DndContext>
  )
}
