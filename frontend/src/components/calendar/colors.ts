import type { TFunction } from 'i18next'
import type { CalendarEvent, CalendarEventType } from '../../types/calendar'

export const EVENT_COLORS: Record<CalendarEventType, string> = {
  on_call:    'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
  training:   'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  deployment: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  task:       'bg-sky-500/20 text-sky-300 border border-sky-500/30',
}

export const DOT_COLORS: Record<CalendarEventType, string> = {
  on_call:    'bg-indigo-400',
  training:   'bg-emerald-400',
  deployment: 'bg-amber-400',
  task:       'bg-sky-400',
}

// Cor de exibição de uma tarefa: override manual > cor da 1ª tag do ticket vinculado > padrão
export const DEFAULT_TASK_COLOR = '#38bdf8' // sky-400

export function taskDisplayColor(ev: CalendarEvent): string {
  return ev.color ?? ev.ticket?.tags[0]?.color ?? DEFAULT_TASK_COLOR
}

// Texto de exibição de um evento no grid (mensal ou diário) — mesma regra nos dois lugares
export function eventLabel(ev: CalendarEvent, t: TFunction): string {
  switch (ev.type) {
    case 'on_call':
      return ev.agent.name
    case 'deployment':
      return ev.notes ?? t('calendar.type.deployment')
    case 'task':
      return ev.title ?? t('calendar.type.task')
    default:
      return ev.source?.name ?? ev.agent.name
  }
}
