import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/axios'

export interface AppNotification {
  id: number
  type: string
  ticket_id: number | null
  ticket_external_id: string | null
  ticket_subject: string | null
  actor_name: string
  event_date: string | null
  read_at: string | null
  created_at: string
  source_id: number | null
  source_name: string | null
}

export function useNotifications() {
  return useQuery<AppNotification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get<AppNotification[]>('/me/notifications')
      return data
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useAllNotifications(params?: { unread_only?: boolean }) {
  return useQuery<AppNotification[]>({
    queryKey: ['notifications', 'all', params],
    queryFn: async () => {
      const search = new URLSearchParams()
      search.set('limit', '500')
      if (params?.unread_only) search.set('unread_only', 'true')
      const { data } = await api.get<AppNotification[]>(`/me/notifications?${search}`)
      return data
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useUnreadCount() {
  return useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await api.get<{ count: number }>('/me/notifications/unread-count')
      return data.count
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await api.patch(`/me/notifications/${id}/read`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await api.post('/me/notifications/read-all')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkSelectedRead() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, number[]>({
    mutationFn: async (ids) => {
      await api.post('/me/notifications/read-selected', { ids })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkTicketRead() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, number>({
    mutationFn: async (ticketId) => {
      await api.post(`/me/notifications/read-ticket/${ticketId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
