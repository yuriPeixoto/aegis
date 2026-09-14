import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/axios'

export interface ClienteModuloLink {
  modulo_id: number
  nome: string
  ativo: boolean
  ativado_em: string
}

export interface Cliente {
  id: number
  nome: string
  ativo: boolean
  source_id: number | null
  source_name: string | null
  modulos: ClienteModuloLink[]
  created_at: string
}

interface ClienteCreatePayload {
  nome: string
  source_id?: number | null
}

interface ClienteUpdatePayload {
  nome?: string
  ativo?: boolean
  source_id: number | null
}

export function useClientes() {
  return useQuery<Cliente[]>({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data } = await api.get<Cliente[]>('/clientes')
      return data
    },
  })
}

export function useCreateCliente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ClienteCreatePayload) => {
      const { data } = await api.post<Cliente>('/clientes', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}

export function useUpdateCliente(clienteId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ClienteUpdatePayload) => {
      const { data } = await api.patch<Cliente>(`/clientes/${clienteId}`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}

export function useSetClienteModulos(clienteId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (moduloIds: number[]) => {
      const { data } = await api.put<Cliente>(`/clientes/${clienteId}/modulos`, {
        modulo_ids: moduloIds,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      queryClient.invalidateQueries({ queryKey: ['modulos'] })
    },
  })
}
