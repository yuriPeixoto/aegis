import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/axios'
import type {
  TicketListResponse,
  TicketDetail,
  TicketFilters,
  TicketMessage,
  TicketAttachment,
  Tag,
  Note,
} from '../types/ticket'

export function useTickets(filters: TicketFilters = {}) {
  // Use URLSearchParams for array support (tag_ids)
  const queryKey = ['tickets', filters]

  return useQuery<TicketListResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach((v) => params.append(key, String(v)))
          } else {
            params.append(key, String(value))
          }
        }
      })

      const { data } = await api.get<TicketListResponse>(`/tickets?${params.toString()}`)
      return data
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data } = await api.get<Tag[]>('/tags')
      return data
    },
  })
}

export function useUpdateTicketTags(ticketId: number) {
  const queryClient = useQueryClient()
  return useMutation<TicketDetail, Error, number[]>({
    mutationFn: async (tagIds) => {
      const { data } = await api.put<TicketDetail>(`/tickets/${ticketId}/tags`, {
        tag_ids: tagIds,
      })
      return data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['ticket', ticketId], updated)
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export function useTagManagement() {
  const queryClient = useQueryClient()

  const createTag = useMutation<Tag, Error, Omit<Tag, 'id'>>({
    mutationFn: async (tagData) => {
      const { data } = await api.post<Tag>('/tags', tagData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })

  const updateTag = useMutation<Tag, Error, Tag>({
    mutationFn: async ({ id, ...tagData }) => {
      const { data } = await api.patch<Tag>(`/tags/${id}`, tagData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })

  const deleteTag = useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await api.delete(`/tags/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })

  return { createTag, updateTag, deleteTag }
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
  return useMutation<
    TicketMessage,
    Error,
    { body: string; is_internal?: boolean; mentioned_user_ids?: number[]; file?: File | null }
  >({
    mutationFn: async ({ body, is_internal = false, mentioned_user_ids = [], file }) => {
      const form = new FormData()
      form.append('body', body)
      form.append('is_internal', String(is_internal))
      form.append('mentioned_user_ids', JSON.stringify(mentioned_user_ids))
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

export function useUpdatePriority(ticketId: number) {
  const queryClient = useQueryClient()
  return useMutation<TicketDetail, Error, { priority: string }>({
    mutationFn: async (body) => {
      const { data } = await api.patch<TicketDetail>(`/tickets/${ticketId}/priority`, body)
      return data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['ticket', ticketId], updated)
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export interface BulkUpdatePayload {
  ticket_ids: number[]
  status?: string
  priority?: string
  assigned_to_user_id?: number | null
  comment?: string
}

export function useBulkUpdateTickets() {
  const queryClient = useQueryClient()
  return useMutation<any, Error, BulkUpdatePayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post('/tickets/bulk-update', payload)
      return data
    },
    onSuccess: () => {
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

export interface InternalTicketPayload {
  subject: string
  description: string
  type: string
  priority: string
  meta?: Record<string, any>
}

export function useMergeTicket(ticketId: number) {
  const queryClient = useQueryClient()
  return useMutation<TicketDetail, Error, { target_ticket_id: number }>({
    mutationFn: async (body) => {
      const { data } = await api.post<TicketDetail>(`/tickets/${ticketId}/merge`, body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
    },
  })
}

export function useNotes(ticketId: number) {
  return useQuery<Note[]>({
    queryKey: ['notes', ticketId],
    queryFn: async () => {
      const { data } = await api.get<Note[]>(`/tickets/${ticketId}/notes`)
      return data
    },
  })
}

export function useCreateNote(ticketId: number) {
  const queryClient = useQueryClient()
  return useMutation<Note, Error, { body: string }>({
    mutationFn: async (payload) => {
      const { data } = await api.post<Note>(`/tickets/${ticketId}/notes`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', ticketId] })
    },
  })
}

export function useCreateInternalTicket() {
  const queryClient = useQueryClient()
  return useMutation<TicketDetail, Error, InternalTicketPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post<TicketDetail>('/tickets/internal', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}
