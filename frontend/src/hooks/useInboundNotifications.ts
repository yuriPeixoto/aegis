import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/axios'
import { useMe } from './useAuth'
import type { TicketListResponse } from '../types/ticket'

const POLL_INTERVAL = 30_000

// ── localStorage keys ─────────────────────────────────────────────────────────
const PREF_OS     = 'aegis-notif-os'
const PREF_BADGE  = 'aegis-notif-badge'
const PREF_SOUND  = 'aegis-notif-sound'
const VIEWED_KEY  = (id: number) => `ticket-viewed-${id}`

// ── Public helpers ────────────────────────────────────────────────────────────
export function markTicketAsViewed(ticketId: number) {
  localStorage.setItem(VIEWED_KEY(ticketId), new Date().toISOString())
}

export function getNotifPrefs() {
  return {
    os:    localStorage.getItem(PREF_OS)    !== 'false', // default: on
    badge: localStorage.getItem(PREF_BADGE) !== 'false', // default: on
    sound: localStorage.getItem(PREF_SOUND) === 'true',  // default: off
  }
}

export function setNotifPref(key: 'os' | 'badge' | 'sound', value: boolean) {
  const map = { os: PREF_OS, badge: PREF_BADGE, sound: PREF_SOUND }
  localStorage.setItem(map[key], String(value))
}

// ── Synthesised "ding" — no audio file needed ─────────────────────────────────
function playDing() {
  try {
    const ctx = new AudioContext()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)
  } catch {
    // AudioContext blocked or unavailable — silent fail
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useInboundNotifications() {
  const { t }       = useTranslation()
  const { data: me } = useMe()
  const { pathname } = useLocation()
  const navigate    = useNavigate()

  // Keep navigate stable in async callbacks
  const navigateRef = useRef(navigate)
  useEffect(() => { navigateRef.current = navigate }, [navigate])

  const permissionRef  = useRef(false)
  // ticket_id → last_inbound_at: tracks new client messages
  const prevInboundRef = useRef<Record<number, string | null> | null>(null)
  // set of ticket IDs seen so far: detects brand-new high/urgent tickets
  const knownIdsRef    = useRef<Set<number> | null>(null)
  // count of unseen high/urgent tickets for tab badge
  const unseenRef      = useRef(0)

  // Clear badge when user is on inbox
  useEffect(() => {
    if (pathname === '/') {
      unseenRef.current = 0
      document.title = 'Aegis'
    }
  }, [pathname])

  // Request OS notification permission once on mount
  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') {
      permissionRef.current = true
      return
    }
    if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((p) => {
        permissionRef.current = p === 'granted'
      })
    }
  }, [])

  // Poll ticket list in background
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
    if (!data || !me) return
    if (me.role === 'viewer') return

    const prefs   = getNotifPrefs()
    const isAdmin = me.role === 'admin'

    // Build snapshot of current data
    const currentInbound: Record<number, string | null> = {}
    const currentIds = new Set<number>()
    data.items.forEach((t) => {
      currentInbound[t.id] = t.last_inbound_at ?? null
      currentIds.add(t.id)
    })

    // First load: initialise refs silently — no notifications on page open
    if (prevInboundRef.current === null || knownIdsRef.current === null) {
      prevInboundRef.current = currentInbound
      knownIdsRef.current    = currentIds
      return
    }

    const fireOsNotif = (title: string, body: string, tag: string, ticketId: number) => {
      if (!prefs.os || !permissionRef.current || !('Notification' in window)) return
      const n = new Notification(title, { body, icon: '/favicon.ico', tag })
      n.onclick = () => {
        window.focus()
        navigateRef.current(`/tickets/${ticketId}`)
        n.close()
      }
    }

    // ── 1. New high/urgent tickets (ID diff) ──────────────────────────────────
    data.items.forEach((ticket) => {
      if (knownIdsRef.current!.has(ticket.id)) return
      if (ticket.priority !== 'high' && ticket.priority !== 'urgent') return
      // Agents only see tickets assigned to them
      if (!isAdmin && ticket.assigned_to_user_id !== me.id) return

      fireOsNotif(
        t('notifications.newUrgentTicket', {
          priority: t(`priority.${ticket.priority}`),
        }),
        ticket.subject,
        `ticket-urgent-${ticket.id}`,
        ticket.id,
      )

      if (prefs.sound) playDing()

      if (prefs.badge) {
        unseenRef.current++
        document.title = `(${unseenRef.current}) Aegis`
      }
    })

    // ── 2. New client messages on existing tickets ────────────────────────────
    data.items.forEach((ticket) => {
      if (!ticket.last_inbound_at) return
      if (!isAdmin && ticket.assigned_to_user_id !== me.id) return

      const prev = prevInboundRef.current![ticket.id]
      if (prev === ticket.last_inbound_at) return

      const lastViewed = localStorage.getItem(VIEWED_KEY(ticket.id))
      if (lastViewed && ticket.last_inbound_at <= lastViewed) return

      fireOsNotif(
        t('notifications.newMessage', { source: ticket.source_name }),
        ticket.subject,
        `ticket-msg-${ticket.id}`,
        ticket.id,
      )
    })

    // ── Update refs ───────────────────────────────────────────────────────────
    prevInboundRef.current = currentInbound
    data.items.forEach((t) => knownIdsRef.current!.add(t.id))
  }, [data, me, t])
}
