import type { CalendarEvent } from '../../types/calendar'

// Mesma regra usada no modal de edição: plantão só admin, o resto (treinamento/
// tarefa/deploy) é o próprio dono do evento ou admin.
export function canEditEvent(ev: CalendarEvent, isAdmin: boolean, currentUserId: number): boolean {
  if (ev.type === 'on_call') return isAdmin
  return isAdmin || ev.agent_id === currentUserId
}
