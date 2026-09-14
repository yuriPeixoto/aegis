import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/axios'

export interface Modulo {
  id: number
  nome: string
  ativo: boolean
  clientes_count: number
  created_at: string
}

export function useModulos() {
  return useQuery<Modulo[]>({
    queryKey: ['modulos'],
    queryFn: async () => {
      const { data } = await api.get<Modulo[]>('/modulos')
      return data
    },
  })
}

export function useCreateModulo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (nome: string) => {
      const { data } = await api.post<Modulo>('/modulos', { nome })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modulos'] })
    },
  })
}

export function useUpdateModulo(moduloId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { nome?: string; ativo?: boolean }) => {
      const { data } = await api.patch<Modulo>(`/modulos/${moduloId}`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modulos'] })
    },
  })
}
