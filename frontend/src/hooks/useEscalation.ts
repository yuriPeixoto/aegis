import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/axios'

export interface EscalationRule {
  id: number
  name: string
  is_active: boolean
  trigger_type: string
  trigger_hours: number
  condition_priority: string[]
  condition_status: string[]
  action_type: string
  action_user_id: number | null
  action_user_name: string | null
  action_tag_id: number | null
  cooldown_hours: number
  created_at: string
}

export interface EscalationRuleCreate {
  name: string
  is_active?: boolean
  trigger_type: string
  trigger_hours: number
  condition_priority?: string[]
  condition_status?: string[]
  action_type: string
  action_user_id?: number | null
  action_tag_id?: number | null
  cooldown_hours?: number
}

export interface EscalationRunResult {
  rules_evaluated: number
  tickets_escalated: number
  actions_taken: string[]
}

export function useEscalationRules() {
  return useQuery<EscalationRule[]>({
    queryKey: ['escalation', 'rules'],
    queryFn: async () => {
      const { data } = await api.get<EscalationRule[]>('/escalation/rules')
      return data
    },
  })
}

export function useCreateEscalationRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: EscalationRuleCreate) => {
      const { data } = await api.post<EscalationRule>('/escalation/rules', payload)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['escalation', 'rules'] }),
  })
}

export function useUpdateEscalationRule(ruleId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<EscalationRuleCreate>) => {
      const { data } = await api.patch<EscalationRule>(`/escalation/rules/${ruleId}`, payload)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['escalation', 'rules'] }),
  })
}

export function useDeleteEscalationRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ruleId: number) => {
      await api.delete(`/escalation/rules/${ruleId}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['escalation', 'rules'] }),
  })
}

export function useRunEscalation() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<EscalationRunResult>('/escalation/run')
      return data
    },
  })
}
