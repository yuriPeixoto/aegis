import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/axios'

export interface Source {
  id: number
  name: string
  slug: string
  is_active: boolean
  webhook_url: string | null
  csat_enabled: boolean
  csat_sampling_pct: number
  created_at: string
}

export interface SourceCreated extends Source {
  api_key: string
  webhook_secret: string
}

export interface SourceKeyRegenerated {
  api_key: string
  webhook_secret: string
}

interface SourceCreatePayload {
  name: string
  slug: string
}

interface SourceUpdatePayload {
  name?: string
  is_active?: boolean
  webhook_url?: string
  csat_enabled?: boolean
  csat_sampling_pct?: number
}

export function useSources() {
  return useQuery<Source[]>({
    queryKey: ['sources'],
    queryFn: async () => {
      const { data } = await api.get<Source[]>('/sources')
      return data
    },
  })
}

export function useCreateSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SourceCreatePayload) => {
      const { data } = await api.post<SourceCreated>('/sources', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
    },
  })
}

export function useUpdateSource(sourceId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SourceUpdatePayload) => {
      const { data } = await api.patch<Source>(`/sources/${sourceId}`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
    },
  })
}

export function useRegenerateSourceKey(sourceId: number) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<SourceKeyRegenerated>(`/sources/${sourceId}/regenerate-key`)
      return data
    },
  })
}
