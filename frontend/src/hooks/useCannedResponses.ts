import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/axios'

export interface CannedResponseActions {
  status?: string
  priority?: string
  assigned_to_user_id?: number
}

export interface CannedResponse {
  id: number
  title: string
  body: string
  actions?: CannedResponseActions
  created_by_id?: number
  created_at: string
  updated_at: string
}

export interface CannedResponseCreate {
  title: string
  body: string
  actions?: CannedResponseActions
}

export function useCannedResponses() {
  return useQuery<CannedResponse[]>({
    queryKey: ['canned-responses'],
    queryFn: async () => {
      const { data } = await api.get<CannedResponse[]>('/canned-responses')
      return data
    },
  })
}

export function useCreateCannedResponse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CannedResponseCreate) => {
      const { data } = await api.post<CannedResponse>('/canned-responses', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canned-responses'] })
    },
  })
}

export function useUpdateCannedResponse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CannedResponseCreate> & { id: number }) => {
      const { data } = await api.patch<CannedResponse>(`/canned-responses/${id}`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canned-responses'] })
    },
  })
}

export function useDeleteCannedResponse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/canned-responses/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canned-responses'] })
    },
  })
}

export function useApplyCannedResponse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ ticket_id, canned_response_id }: { ticket_id: number, canned_response_id: number }) => {
      const { data } = await api.post('/canned-responses/apply', { ticket_id, canned_response_id })
      return data
    },
    onSuccess: (_, { ticket_id }) => {
      queryClient.invalidateQueries({ queryKey: ['tickets', ticket_id] })
      queryClient.invalidateQueries({ queryKey: ['messages', ticket_id] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] }) // Invalidate list for status changes
    },
  })
}
