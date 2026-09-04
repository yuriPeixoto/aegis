import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/axios'

export interface BusinessHours {
  work_days: number[]
  work_start: string
  work_end: string
  lunch_start: string | null
  lunch_end: string | null
  timezone: string
}

export interface SlaPolicy {
  priority: string
  resolution_hours: number
}

export interface Holiday {
  id: number
  date: string
  description: string
}

export interface SlaSettings {
  business_hours: BusinessHours
  policies: SlaPolicy[]
  holidays: Holiday[]
}

export interface CalendarReference {
  business_hours: BusinessHours
  holidays: Holiday[]
}

// Versão leve do /settings/sla (sem políticas de SLA) aberta a qualquer
// usuário logado — usada pela Agenda pra sombrear fora do expediente/feriado
// (#1250, item #600). Reaproveita o mesmo BusinessHoursConfig/SlaHoliday já
// mantido em Configurações → SLA.
export function useCalendarReference() {
  return useQuery<CalendarReference>({
    queryKey: ['calendar-reference'],
    queryFn: async () => {
      const { data } = await api.get<CalendarReference>('/settings/calendar-reference')
      return data
    },
  })
}

export function useSlaSettings() {
  return useQuery<SlaSettings>({
    queryKey: ['sla-settings'],
    queryFn: async () => {
      const { data } = await api.get<SlaSettings>('/settings/sla')
      return data
    },
  })
}

export function useUpdateBusinessHours() {
  const queryClient = useQueryClient()
  return useMutation<BusinessHours, Error, Partial<BusinessHours>>({
    mutationFn: async (body) => {
      const { data } = await api.patch<BusinessHours>('/settings/sla/business-hours', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-settings'] })
    },
  })
}

export function useUpdateSlaPolicy() {
  const queryClient = useQueryClient()
  return useMutation<SlaPolicy, Error, { priority: string; resolution_hours: number }>({
    mutationFn: async ({ priority, resolution_hours }) => {
      const { data } = await api.patch<SlaPolicy>(`/settings/sla/policies/${priority}`, { resolution_hours })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-settings'] })
    },
  })
}

export function useCreateHoliday() {
  const queryClient = useQueryClient()
  return useMutation<Holiday, Error, { date: string; description: string }>({
    mutationFn: async (body) => {
      const { data } = await api.post<Holiday>('/settings/sla/holidays', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-settings'] })
    },
  })
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await api.delete(`/settings/sla/holidays/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-settings'] })
    },
  })
}
