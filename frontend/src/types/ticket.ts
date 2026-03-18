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

export interface TicketSource {
  id: number
  name: string
  slug: string
}

export interface TicketEvent {
  id: number
  event_type: string
  payload: Record<string, unknown>
  occurred_at: string
}

export interface Ticket {
  id: number
  external_id: string
  type: TicketType
  priority: TicketPriority
  status: TicketStatus
  subject: string
  description: string | null
  source: TicketSource
  source_created_at: string
  source_updated_at: string
  first_ingested_at: string
  last_synced_at: string
}

export interface TicketDetail extends Ticket {
  events: TicketEvent[]
}

export interface TicketListResponse {
  tickets: Ticket[]
  total: number
  page: number
  page_size: number
}

export interface TicketFilters {
  source_id?: number
  status?: TicketStatus
  priority?: TicketPriority
  type?: TicketType
  page?: number
}
