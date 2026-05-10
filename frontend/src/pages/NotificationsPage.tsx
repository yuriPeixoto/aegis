import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Search } from 'lucide-react'
import {
  useAllNotifications,
  useMarkRead,
  useMarkAllRead,
  useMarkSelectedRead,
  type AppNotification,
} from '../hooks/useNotifications'
import { notifMeta, formatRelative } from '../utils/notificationHelpers'

type ReadFilter = 'all' | 'unread' | 'read'

export function NotificationsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<number | 'all'>('all')
  const [readFilter, setReadFilter] = useState<ReadFilter>('all')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const { data: allNotifications = [], isLoading } = useAllNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()
  const markSelected = useMarkSelectedRead()

  const sources = useMemo(() => {
    const seen = new Map<number, string>()
    for (const n of allNotifications) {
      if (n.source_id != null && n.source_name) seen.set(n.source_id, n.source_name)
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [allNotifications])

  const notifications = useMemo(() => {
    const q = search.toLowerCase()
    return allNotifications.filter((n) => {
      if (readFilter === 'unread' && n.read_at) return false
      if (readFilter === 'read' && !n.read_at) return false
      if (sourceFilter !== 'all' && n.source_id !== sourceFilter) return false
      if (q && !(
        n.actor_name?.toLowerCase().includes(q) ||
        n.ticket_external_id?.toLowerCase().includes(q) ||
        n.ticket_subject?.toLowerCase().includes(q) ||
        n.source_name?.toLowerCase().includes(q)
      )) return false
      return true
    })
  }, [allNotifications, readFilter, sourceFilter, search])

  const hasUnread = allNotifications.some((n) => !n.read_at)

  const selectedUnreadIds = useMemo(
    () => [...selected].filter((id) => {
      const n = allNotifications.find((n) => n.id === id)
      return n && !n.read_at
    }),
    [selected, allNotifications],
  )

  const allVisibleSelected =
    notifications.length > 0 && notifications.every((n) => selected.has(n.id))

  function toggleAll() {
    if (allVisibleSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(notifications.map((n) => n.id)))
    }
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleClick(notif: AppNotification) {
    if (!notif.read_at) markRead.mutate(notif.id)
    const { href } = notifMeta(notif, t)
    navigate(href)
  }

  function handleMarkSelected() {
    if (!selectedUnreadIds.length) return
    markSelected.mutate(selectedUnreadIds, {
      onSuccess: () => setSelected(new Set()),
    })
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">{t('notificationsPage.title')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('notificationsPage.subtitle')}</p>
        </div>
        {hasUnread && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-accent transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            {t('notifications.bell.markAllRead')}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('notificationsPage.search')}
            className="w-full bg-brand-surface border border-brand-border rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-accent"
          />
        </div>

        {sources.length > 0 && (
          <select
            value={sourceFilter === 'all' ? '' : String(sourceFilter)}
            onChange={(e) =>
              setSourceFilter(e.target.value === '' ? 'all' : Number(e.target.value))
            }
            className="bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-brand-accent"
          >
            <option value="">{t('notificationsPage.allClients')}</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        <div className="flex rounded-lg border border-brand-border overflow-hidden">
          {(['all', 'unread', 'read'] as ReadFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setReadFilter(f)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                readFilter === f
                  ? 'bg-brand-accent text-white'
                  : 'bg-brand-surface text-slate-400 hover:text-slate-200'
              }`}
            >
              {t(`notificationsPage.filter.${f}`)}
            </button>
          ))}
        </div>

        {selectedUnreadIds.length > 0 && (
          <button
            onClick={handleMarkSelected}
            disabled={markSelected.isPending}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-brand-accent/20 border border-brand-accent/40 text-brand-accent rounded-lg hover:bg-brand-accent/30 transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            {t('notificationsPage.markSelected', { count: selectedUnreadIds.length })}
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm text-slate-500 font-mono animate-pulse">{t('common.loading')}</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Bell className="w-10 h-10 text-slate-700" />
          <p className="text-sm text-slate-500">{t('notifications.bell.empty')}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto rounded-xl border border-brand-border bg-brand-surface">
          {/* Select-all row */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-brand-border/50 bg-white/[0.02]">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleAll}
              className="rounded border-slate-600 bg-brand-surface accent-brand-accent cursor-pointer"
            />
            <span className="text-xs text-slate-500">
              {selected.size > 0
                ? t('notificationsPage.selectedCount', { count: selected.size })
                : t('notificationsPage.selectAll')}
            </span>
          </div>

          {notifications.map((notif) => {
            const unread = !notif.read_at
            const { icon: Icon, label } = notifMeta(notif, t)
            const isSelected = selected.has(notif.id)

            return (
              <div
                key={notif.id}
                className={`flex items-start gap-3 px-4 py-3 border-b border-brand-border/30 last:border-b-0 transition-colors ${
                  unread ? 'bg-amber-950/10' : ''
                } hover:bg-white/[0.02]`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOne(notif.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 rounded border-slate-600 bg-brand-surface accent-brand-accent cursor-pointer shrink-0"
                />

                <button
                  className="flex-1 flex items-start gap-3 text-left min-w-0"
                  onClick={() => handleClick(notif)}
                >
                  <div
                    className={`mt-0.5 shrink-0 p-1.5 rounded-lg ${
                      unread ? 'bg-amber-900/40 text-amber-400' : 'bg-white/5 text-slate-500'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 leading-snug">{label}</p>
                    {notif.ticket_subject && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{notif.ticket_subject}</p>
                    )}
                    {notif.source_name && (
                      <span className="inline-block mt-1 text-[10px] font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-slate-400">
                        {notif.source_name}
                      </span>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1 ml-3">
                    <span className="text-[11px] font-mono text-slate-600 whitespace-nowrap">
                      {formatRelative(notif.created_at, t('notifications.bell.justNow'))}
                    </span>
                    {unread && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
