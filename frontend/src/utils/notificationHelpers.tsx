import React from 'react'
import { AtSign, AlertTriangle, MessageCircle, CalendarDays, BookOpen } from 'lucide-react'

export interface NotifMetaInput {
  type: string
  actor_name: string
  ticket_id: number | null
  ticket_external_id: string | null
  event_date: string | null
}

export interface NotifMeta {
  icon: React.ElementType
  label: React.ReactNode
  href: string
}

export function notifMeta(
  notif: NotifMetaInput,
  t: (key: string, opts?: Record<string, string>) => string,
): NotifMeta {
  if (notif.type === 'on_call_reminder') {
    return {
      icon: CalendarDays,
      label: <>{t('notifications.bell.onCallReminder')} <span className="font-semibold">{notif.event_date}</span></>,
      href: '/agenda',
    }
  }
  if (notif.type === 'training_reminder') {
    return {
      icon: BookOpen,
      label: <>{t('notifications.bell.trainingReminder')} <span className="font-semibold">{notif.event_date}</span></>,
      href: '/agenda',
    }
  }

  const id = <span className="font-mono text-amber-400">#{notif.ticket_external_id}</span>
  const actor = <span className="font-semibold">{notif.actor_name}</span>
  const ticketHref = `/tickets/${notif.ticket_id}`

  if (notif.type === 'new_ticket') {
    return {
      icon: AlertTriangle,
      label: <>{t('notifications.bell.newTicketFrom')} {actor} {id}</>,
      href: ticketHref,
    }
  }
  if (notif.type === 'new_client_message') {
    return {
      icon: MessageCircle,
      label: <>{t('notifications.bell.newMessageFrom')} {actor} {t('notifications.bell.inTicket')} {id}</>,
      href: ticketHref,
    }
  }
  return {
    icon: AtSign,
    label: <>{actor} {t('notifications.bell.mentionedYou')} {id}</>,
    href: ticketHref,
  }
}

export function formatRelative(iso: string, justNow: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return justNow
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}
