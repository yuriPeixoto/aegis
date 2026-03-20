export type TicketType = 'BUG' | 'IMPROVEMENT' | 'QUESTION' | 'SUPPORT'
export type TicketPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'
export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_CLIENT'
  | 'WAITING_DEV'
  | 'IN_DEV'
  | 'WAITING_TEST'
  | 'IN_TEST'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED'

export interface TicketEvent {
  id: number
  event_type: string
  payload: Record<string, unknown> | null
  occurred_at: string
}

export interface Assignee {
  id: number
  name: string
}

export interface Ticket {
  id: number
  source_id: number
  source_name: string
  external_id: string
  type: string | null
  priority: string | null
  status: string
  subject: string
  description: string | null
  source_metadata: Record<string, unknown> | null
  source_created_at: string | null
  source_updated_at: string | null
  first_ingested_at: string
  last_synced_at: string
  sla_due_at: string | null
  sla_status: 'on_time' | 'at_risk' | 'overdue' | 'met' | null
  last_inbound_at: string | null
  assigned_to: Assignee | null
}

export interface TicketDetail extends Ticket {
  events: TicketEvent[]
}

export interface TicketListResponse {
  items: Ticket[]
  total: number
  limit: number
  offset: number
}

export interface NoteAuthor {
  id: number
  name: string
}

export interface TicketNote {
  id: number
  ticket_id: number
  body: string
  author: NoteAuthor | null
  created_at: string
}

export interface TicketMessage {
  id: number
  direction: 'inbound' | 'outbound'
  author_name: string
  body: string
  created_at: string
}

export interface TicketAttachment {
  id: number
  ticket_id: number
  original_filename: string
  content_type: string
  size_bytes: number
  created_at: string
  download_url: string
}

export interface TicketFilters {
  source_id?: number
  status?: string
  priority?: string
  type?: string
  assigned_to_user_id?: number
  unassigned?: boolean
  limit?: number
  offset?: number
}
