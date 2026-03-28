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
  | 'MERGED'

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

export interface Tag {
  id: number
  name: string
  color: string
  description: string | null
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
  sla_started_at: string | null
  sla_paused_since: string | null
  sla_status: 'on_time' | 'at_risk' | 'overdue' | 'met' | 'paused' | null
  last_inbound_at: string | null
  assigned_to: Assignee | null
  tags: Tag[]
  merged_into_ticket_id: number | null
  merged_at: string | null
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

export interface TicketMessage {
  id: number
  direction: 'inbound' | 'outbound'
  author_name: string
  author_user_id: number | null
  body: string
  is_internal: boolean
  mentioned_user_ids: number[]
  created_at: string
  attachments?: {
    id: number
    filename: string
    content_type: string
    size_bytes: number
    download_url: string
  }[]
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
  active_only?: boolean
  priority?: string
  type?: string
  search?: string
  assigned_to_user_id?: number
  unassigned?: boolean
  tag_ids?: number[]
  limit?: number
  offset?: number
}
