import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/axios'
import type {
  CalendarEvent,
  CalendarEventCreate,
  CalendarEventUpdate,
  CalendarFilters,
} from '../types/calendar'

function buildParams(filters: CalendarFilters): URLSearchParams {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value))
    }
  })
  return params
}

export function useCalendarEvents(filters: CalendarFilters = {}) {
  return useQuery<CalendarEvent[]>({
    queryKey: ['calendar', 'events', filters],
    queryFn: async () => {
      const params = buildParams(filters)
      const { data } = await api.get<CalendarEvent[]>(`/calendar/events?${params.toString()}`)
      return data
    },
  })
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CalendarEventCreate) => {
      const { data } = await api.post<CalendarEvent>('/calendar/events', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
    },
  })
}

export function useUpdateCalendarEvent(eventId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CalendarEventUpdate) => {
      const { data } = await api.patch<CalendarEvent>(`/calendar/events/${eventId}`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
    },
  })
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (eventId: number) => {
      await api.delete(`/calendar/events/${eventId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
    },
  })
}
