export type CalendarEventType = 'on_call' | 'training' | 'deployment' | 'task'

export interface AgentSlim {
  id: number
  name: string
  avatar: string | null
}

export interface SourceSlim {
  id: number
  name: string
}

export interface TagSlim {
  id: number
  name: string
  color: string
}

export interface TicketSlim {
  id: number
  external_id: string
  tags: TagSlim[]
}

export interface CalendarEvent {
  id: number
  type: CalendarEventType
  title: string | null
  agent_id: number
  event_date: string        // "YYYY-MM-DD"
  start_time: string | null // "HH:MM"
  end_time: string | null
  source_id: number | null
  ticket_id: number | null
  color: string | null
  pr_number: string | null
  completed_at: string | null
  recurrence_group_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  agent: AgentSlim
  source: SourceSlim | null
  ticket: TicketSlim | null
}

export interface RecurrenceRule {
  freq: 'daily' | 'weekly' | 'monthly'
  interval?: number
  byweekday?: number[] | null // 0=domingo .. 6=sábado, só pra freq='weekly'
  until?: string | null       // "YYYY-MM-DD"
}

export interface CalendarEventCreate {
  type: CalendarEventType
  title?: string | null
  agent_id: number
  event_date: string
  start_time?: string | null
  end_time?: string | null
  source_id?: number | null
  ticket_id?: number | null
  color?: string | null
  pr_number?: string | null
  notes?: string | null
  recurrence?: RecurrenceRule | null
}

export interface CalendarEventUpdate {
  title?: string | null
  agent_id?: number
  event_date?: string
  start_time?: string | null
  end_time?: string | null
  source_id?: number | null
  ticket_id?: number | null
  color?: string | null
  pr_number?: string | null
  notes?: string | null
}

export interface CalendarFilters {
  year?: number
  month?: number
  type?: CalendarEventType
  agent_id?: number
  from_date?: string
}
