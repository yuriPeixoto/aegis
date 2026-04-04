import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/axios'

export type Granularity = 'day' | 'week' | 'month'

export interface AnalyticsPeriod {
  from: string
  to: string
}

export interface AgentKpis {
  total_period: number
  currently_open: number
  resolved_period: number
  mttr_hours: number | null
  sla_rate: number | null
  avg_csat: number | null
}

export interface TrendPoint {
  date: string
  opened: number
}

export interface ResolutionPoint {
  date: string
  resolved: number
  avg_mttr_hours: number | null
}

export interface BreakdownItem {
  priority?: string
  type?: string
  count: number
}

export interface AgentAnalytics {
  user_id: number
  name: string
  avatar: string | null
  role: string
  is_senior: boolean
  created_at: string
  period: AnalyticsPeriod
  granularity: Granularity
  kpis: AgentKpis
  volume_trend: TrendPoint[]
  by_priority: BreakdownItem[]
  by_type: BreakdownItem[]
  features: Record<string, number | null>
  meta: Record<string, unknown>
}

export interface OverviewAgentRow {
  user_id: number
  name: string
  avatar: string | null
  total: number
  resolved: number
  mttr_hours: number | null
}

export interface OverviewAnalytics {
  period: AnalyticsPeriod
  granularity: Granularity
  volume_trend: TrendPoint[]
  resolution_trend: ResolutionPoint[]
  by_type: BreakdownItem[]
  by_priority: BreakdownItem[]
  by_agent: OverviewAgentRow[]
  // ML extension: Phase 4.7 will populate this array with anomaly signals.
  insights: unknown[]
  meta: Record<string, unknown>
}

interface DateRange {
  from?: string
  to?: string
  granularity?: Granularity
}

function buildParams(range?: DateRange) {
  const p = new URLSearchParams()
  if (range?.from) p.set('from', range.from)
  if (range?.to) p.set('to', range.to)
  if (range?.granularity) p.set('granularity', range.granularity)
  return p.toString()
}

export function useAgentAnalytics(userId: number, range?: DateRange) {
  const qs = buildParams(range)
  return useQuery<AgentAnalytics>({
    queryKey: ['analytics', 'agent', userId, range],
    queryFn: async () => {
      const { data } = await api.get<AgentAnalytics>(
        `/analytics/agent/${userId}${qs ? `?${qs}` : ''}`,
      )
      return data
    },
    enabled: !!userId,
  })
}

export function useOverviewAnalytics(range?: DateRange) {
  const qs = buildParams(range)
  return useQuery<OverviewAnalytics>({
    queryKey: ['analytics', 'overview', range],
    queryFn: async () => {
      const { data } = await api.get<OverviewAnalytics>(
        `/analytics/overview${qs ? `?${qs}` : ''}`,
      )
      return data
    },
  })
}
