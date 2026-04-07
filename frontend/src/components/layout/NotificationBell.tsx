import React, { useState, useRef, useEffect } from 'react'
import { Bell, AtSign, AlertTriangle, MessageCircle, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
} from '../../hooks/useNotifications'

type NotifMetaResult = { icon: React.ElementType; label: React.ReactNode }

function notifMeta(
  notif: { type: string; actor_name: string; ticket_external_id: string },
  t: (key: string, opts?: Record<string, string>) => string,
): NotifMetaResult {
  const id = <span className="font-mono text-amber-400">#{notif.ticket_external_id}</span>
  const actor = <span className="font-semibold">{notif.actor_name}</span>

  if (notif.type === 'new_ticket') {
    return {
      icon: AlertTriangle,
      label: <>{t('notifications.bell.newTicketFrom')} {actor} {id}</>,
    }
  }
  if (notif.type === 'new_client_message') {
    return {
      icon: MessageCircle,
      label: <>{t('notifications.bell.newMessageFrom')} {actor} {t('notifications.bell.inTicket')} {id}</>,
    }
  }
  // default: mention
  return {
    icon: AtSign,
    label: <>{actor} {t('notifications.bell.mentionedYou')} {id}</>,
  }
}

function formatRelative(iso: string, justNow: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return justNow
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export function NotificationBell() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { data: count = 0 } = useUnreadCount()
  const { data: notifications = [] } = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  // Sync unread count to browser tab title
  useEffect(() => {
    document.title = count > 0 ? `(${count}) Aegis` : 'Aegis'
  }, [count])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleNotificationClick(notif: typeof notifications[number]) {
    if (!notif.read_at) markRead.mutate(notif.id)
    setOpen(false)
    navigate(`/tickets/${notif.ticket_id}`)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors"
        title={t('notifications.bell.title')}
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-brand-surface border border-brand-border rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border/50">
            <span className="text-xs font-semibold text-slate-300">{t('notifications.bell.title')}</span>
            {count > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-brand-accent transition-colors"
              >
                <CheckCheck className="w-3 h-3" />
                {t('notifications.bell.markAllRead')}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-xs text-slate-600 text-center italic">
                {t('notifications.bell.empty')}
              </p>
            ) : (
              notifications.map((notif) => {
                const unread = !notif.read_at
                const { icon: Icon, label } = notifMeta(notif, t)
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left px-4 py-3 border-b border-brand-border/30 hover:bg-white/5 transition-colors flex gap-3 items-start ${
                      unread ? 'bg-amber-950/20' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className={`mt-0.5 shrink-0 p-1.5 rounded-lg ${
                      unread ? 'bg-amber-900/40 text-amber-400' : 'bg-white/5 text-slate-500'
                    }`}>
                      <Icon className="w-3 h-3" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-200 leading-snug">{label}</p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {notif.ticket_subject}
                      </p>
                    </div>

                    {/* Time + unread dot */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className="text-[10px] font-mono text-slate-600">
                        {formatRelative(notif.created_at, t('notifications.bell.justNow'))}
                      </span>
                      {unread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
