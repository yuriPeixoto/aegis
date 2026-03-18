import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/axios'
import type { TicketListResponse, TicketDetail, TicketFilters } from '../types/ticket'

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

export function useSources() {
  return useQuery<{ id: number; name: string; slug: string }[]>({
    queryKey: ['sources'],
    queryFn: async () => {
      const { data } = await api.get('/sources')
      return data
    },
    staleTime: 60_000,
  })
}
