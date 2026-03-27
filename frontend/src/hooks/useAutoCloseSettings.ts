import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/axios'

export interface AutoCloseSettings {
  enabled: boolean
  wait_days: number
  warning_days: number
  close_message: string
  warning_message: string
}

export function useAutoCloseSettings() {
  return useQuery<AutoCloseSettings>({
    queryKey: ['auto-close-settings'],
    queryFn: async () => {
      const { data } = await api.get<AutoCloseSettings>('/settings/auto-close')
      return data
    },
  })
}

export function useUpdateAutoCloseSettings() {
  const queryClient = useQueryClient()
  return useMutation<AutoCloseSettings, Error, Partial<AutoCloseSettings>>({
    mutationFn: async (body) => {
      const { data } = await api.patch<AutoCloseSettings>('/settings/auto-close', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-close-settings'] })
    },
  })
}
