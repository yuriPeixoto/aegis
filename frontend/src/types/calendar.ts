export type CalendarEventType = 'on_call' | 'training'

export interface AgentSlim {
  id: number
  name: string
  avatar: string | null
}

export interface SourceSlim {
  id: number
  name: string
}

export interface CalendarEvent {
  id: number
  type: CalendarEventType
  agent_id: number
  event_date: string        // "YYYY-MM-DD"
  start_time: string | null // "HH:MM"
  end_time: string | null
  source_id: number | null
  notes: string | null
  created_at: string
  updated_at: string
  agent: AgentSlim
  source: SourceSlim | null
}

export interface CalendarEventCreate {
  type: CalendarEventType
  agent_id: number
  event_date: string
  start_time?: string | null
  end_time?: string | null
  source_id?: number | null
  notes?: string | null
}

export interface CalendarEventUpdate {
  agent_id?: number
  event_date?: string
  start_time?: string | null
  end_time?: string | null
  source_id?: number | null
  notes?: string | null
}

export interface CalendarFilters {
  year?: number
  month?: number
  type?: CalendarEventType
  agent_id?: number
  from_date?: string
}
