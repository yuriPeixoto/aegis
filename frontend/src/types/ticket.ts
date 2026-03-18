export type TicketType = 'BUG' | 'MELHORIA' | 'DUVIDA' | 'SUPORTE'
export type TicketPriority = 'URGENTE' | 'ALTO' | 'MEDIO' | 'BAIXO'
export type TicketStatus =
  | 'ABERTO'
  | 'EM_ATENDIMENTO'
  | 'AGUARDANDO_CLIENTE'
  | 'AGUARDANDO_DESENVOLVIMENTO'
  | 'EM_DESENVOLVIMENTO'
  | 'AGUARDANDO_TESTE'
  | 'EM_TESTE'
  | 'RESOLVIDO'
  | 'FECHADO'
  | 'CANCELADO'

export interface TicketEvent {
  id: number
  event_type: string
  payload: Record<string, unknown> | null
  occurred_at: string
}

export interface Ticket {
  id: number
  source_id: number
  source_name: string
  external_id: string
  type: TicketType | null
  priority: TicketPriority | null
  status: TicketStatus
  subject: string
  description: string | null
  source_metadata: Record<string, unknown> | null
  source_created_at: string | null
  source_updated_at: string | null
  first_ingested_at: string
  last_synced_at: string
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

export interface TicketFilters {
  source_id?: number
  status?: TicketStatus
  priority?: TicketPriority
  type?: TicketType
  limit?: number
  offset?: number
}
