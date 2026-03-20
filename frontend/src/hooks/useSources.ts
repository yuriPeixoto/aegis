import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/axios'

export interface Source {
  id: number
  name: string
  slug: string
  is_active: boolean
  created_at: string
}

export interface SourceCreated extends Source {
  api_key: string
}

interface SourceCreatePayload {
  name: string
  slug: string
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
