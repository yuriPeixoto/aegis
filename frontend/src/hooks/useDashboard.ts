import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/axios'

export interface AgentMonitorTicket {
  id: number
  external_id: string
  subject: string
  priority: string | null
  status: string
  sla_due_at: string | null
  sla_status: 'ok' | 'at_risk' | 'overdue' | 'paused' | null
  has_unanswered_message: boolean
  last_message_at: string | null
  waiting_since: string | null
}

export interface AgentMonitorEntry {
  user_id: number
  name: string
  tickets: AgentMonitorTicket[]
}

export interface AgentMonitorData {
  agents: AgentMonitorEntry[]
}

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
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useAgentMonitor() {
  return useQuery<AgentMonitorData>({
    queryKey: ['dashboard', 'agent-monitor'],
    queryFn: async () => {
      const { data } = await api.get<AgentMonitorData>('/dashboard/agent-monitor')
      return data
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}
