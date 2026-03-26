import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/axios'
import type { TicketListResponse, TicketDetail, TicketFilters, TicketMessage, TicketNote, TicketAttachment } from '../types/ticket'

export function useTickets(filters: TicketFilters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''),
  )

  return useQuery<TicketListResponse>({
    queryKey: ['tickets', params],
    queryFn: async () => {
      const { data } = await api.get<TicketListResponse>('/tickets', { params })
      return data
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useTicket(id: number | null) {
  return useQuery<TicketDetail>({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const { data } = await api.get<TicketDetail>(`/tickets/${id}`)
      return data
    },
    enabled: id !== null,
  })
}

export function useUsers() {
  return useQuery<{ id: number; name: string; role: string }[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users')
      return data
    },
    staleTime: 60_000,
  })
}

export function useAssignTicket(ticketId: number) {
  const queryClient = useQueryClient()
  return useMutation<TicketDetail, Error, { user_id: number | null }>({
    mutationFn: async (body) => {
      const { data } = await api.patch<TicketDetail>(`/tickets/${ticketId}/assign`, body)
      return data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['ticket', ticketId], updated)
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export function useUpdateTicketStatus(ticketId: number) {
  const queryClient = useQueryClient()
  return useMutation<TicketDetail, Error, { status: string; comment?: string }>({
    mutationFn: async (body) => {
      const { data } = await api.patch<TicketDetail>(`/tickets/${ticketId}/status`, body)
      return data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['ticket', ticketId], updated)
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export function useNotes(ticketId: number) {
  return useQuery<TicketNote[]>({
    queryKey: ['notes', ticketId],
    queryFn: async () => {
      const { data } = await api.get<TicketNote[]>(`/tickets/${ticketId}/notes`)
      return data
    },
  })
}

export function useMessages(ticketId: number) {
  return useQuery<TicketMessage[]>({
    queryKey: ['messages', ticketId],
    queryFn: async () => {
      const { data } = await api.get<TicketMessage[]>(`/tickets/${ticketId}/messages`)
      return data
    },
    refetchInterval: 15_000,
  })
}

export function useSendMessage(ticketId: number) {
  const queryClient = useQueryClient()
  return useMutation<TicketMessage, Error, { body: string; file?: File | null }>({
    mutationFn: async ({ body, file }) => {
      const form = new FormData()
      form.append('body', body)
      if (file) form.append('file', file)
      const { data } = await api.post<TicketMessage>(
        `/tickets/${ticketId}/messages`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', ticketId] })
    },
  })
}

export function useCreateNote(ticketId: number) {
  const queryClient = useQueryClient()
  return useMutation<TicketNote, Error, { body: string }>({
    mutationFn: async (payload) => {
      const { data } = await api.post<TicketNote>(`/tickets/${ticketId}/notes`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', ticketId] })
    },
  })
}

export function useAttachments(ticketId: number) {
  return useQuery<TicketAttachment[]>({
    queryKey: ['attachments', ticketId],
    queryFn: async () => {
      const { data } = await api.get<TicketAttachment[]>(`/tickets/${ticketId}/attachments`)
      return data
    },
  })
}

export function useOverrideSla(ticketId: number) {
  const queryClient = useQueryClient()
  return useMutation<TicketDetail, Error, { due_at: string; reason?: string }>({
    mutationFn: async (body) => {
      const { data } = await api.patch<TicketDetail>(`/tickets/${ticketId}/sla`, body)
      return data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['ticket', ticketId], updated)
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export function useUploadAttachment(ticketId: number) {
  const queryClient = useQueryClient()
  return useMutation<TicketAttachment, Error, File>({
    mutationFn: async (file) => {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post<TicketAttachment>(
        `/tickets/${ticketId}/attachments`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', ticketId] })
    },
  })
}

export function useSources() {
  return useQuery<{ id: number; name: string; slug: string }[]>({
    queryKey: ['sources'],
    queryFn: async () => {
      const { data } = await api.get('/sources')
      return Array.isArray(data) ? data : []
    },
    staleTime: 60_000,
  })
}
