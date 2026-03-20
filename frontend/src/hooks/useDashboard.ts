import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/axios'

export interface AgentStat {
  user_id: number
  name: string
  open: number
  overdue: number
  resolved_period: number
}

export interface ClientStat {
  source_id: number
  name: string
  open: number
}

export interface OverdueTicketItem {
  id: number
  external_id: string
  subject: string
  priority: string | null
  source_name: string
  sla_due_at: string
  assigned_to_name: string | null
  hours_overdue: number
}

export interface UnassignedTicketItem {
  id: number
  external_id: string
  subject: string
  priority: string | null
  source_name: string
  first_ingested_at: string
}

export interface DashboardStats {
  total_open: number
  overdue: number
  waiting_client: number
  unassigned: number
  opened_today: number
  resolved_today: number
  sla_compliance_pct: number | null
  mttr_hours: number | null
  by_priority: { priority: string; count: number }[]
  by_client: ClientStat[]
  by_agent: AgentStat[]
  overdue_tickets: OverdueTicketItem[]
  unassigned_tickets: UnassignedTicketItem[]
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<DashboardStats>('/dashboard/stats')
      return data
    },
    refetchInterval: 60_000,
  })
}
