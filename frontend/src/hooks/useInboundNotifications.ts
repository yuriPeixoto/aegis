import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/axios'
import type { TicketListResponse } from '../types/ticket'

const POLL_INTERVAL = 30_000
const VIEWED_KEY = (id: number) => `ticket-viewed-${id}`

export function markTicketAsViewed(ticketId: number) {
  localStorage.setItem(VIEWED_KEY(ticketId), new Date().toISOString())
}

export function useInboundNotifications() {
  const permissionGranted = useRef(false)
  // prev state: ticketId → last_inbound_at ISO string (or null)
  const prevMapRef = useRef<Record<number, string | null> | null>(null)

  // Request browser notification permission once on mount
  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') {
      permissionGranted.current = true
      return
    }
    if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((p) => {
        permissionGranted.current = p === 'granted'
      })
    }
  }, [])

  const { data } = useQuery<TicketListResponse>({
    queryKey: ['tickets-notify'],
    queryFn: async () => {
      const { data } = await api.get<TicketListResponse>('/tickets', {
        params: { limit: 100 },
      })
      return data
    },
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: true,
  })

  useEffect(() => {
    if (!data) return

    const currentMap: Record<number, string | null> = {}
    data.items.forEach((t) => {
      currentMap[t.id] = t.last_inbound_at ?? null
    })

    if (prevMapRef.current === null) {
      // First load — initialize without notifying (avoid noise on page open)
      prevMapRef.current = currentMap
      return
    }

    data.items.forEach((t) => {
      if (!t.last_inbound_at) return

      const prev = prevMapRef.current![t.id]
      // No change since last poll
      if (prev === t.last_inbound_at) return

      // Changed — check if agent already viewed it after this message
      const lastViewed = localStorage.getItem(VIEWED_KEY(t.id))
      if (lastViewed && t.last_inbound_at <= lastViewed) return

      if (permissionGranted.current && 'Notification' in window) {
        new Notification(`Nova mensagem — ${t.source_name}`, {
          body: t.subject,
          icon: '/favicon.ico',
          tag: `ticket-${t.id}`, // deduplicates: replaces previous notification for same ticket
        })
      }
    })

    prevMapRef.current = currentMap
  }, [data])
}
