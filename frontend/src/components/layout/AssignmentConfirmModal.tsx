import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserCheck, AlertTriangle, ArrowRight } from 'lucide-react'
import { useAllNotifications, useMarkRead } from '../../hooks/useNotifications'

// Notification types that block the UI until acknowledged. 'assigned' is the
// original #1086 case; 'critical_source' covers Log Watcher/Cronwatch tickets (#1271).
const BLOCKING_TYPES = ['assigned', 'critical_source']

export function AssignmentConfirmModal() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: notifications = [] } = useAllNotifications({ unread_only: true })
  const { mutate: markRead, isPending } = useMarkRead()

  // Oldest pending notification first — surfaced one at a time
  const pending = useMemo(
    () =>
      notifications
        .filter((n) => BLOCKING_TYPES.includes(n.type))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [notifications],
  )

  const current = pending[0]
  if (!current) return null

  const isCritical = current.type === 'critical_source'

  const handleConfirm = () => markRead(current.id)
  const handleViewTicket = () => {
    markRead(current.id)
    if (current.ticket_id) navigate(`/tickets/${current.ticket_id}`)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/80 backdrop-blur-sm">
      <div className="bg-brand-dark border border-brand-border rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-brand-border flex items-center gap-2">
          {isCritical ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          ) : (
            <UserCheck className="w-5 h-5 text-brand-purple shrink-0" />
          )}
          <h2 className="text-sm font-semibold text-slate-100">
            {t(isCritical ? 'notifications.criticalSource.title' : 'notifications.assignment.title')}
          </h2>
        </div>

        <div className="px-6 py-4 space-y-2">
          <p className="text-sm text-slate-300">
            <span className="font-semibold">{current.actor_name}</span>{' '}
            {t(isCritical ? 'notifications.criticalSource.body' : 'notifications.assignment.body')}
          </p>
          <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
            <p className="text-xs font-mono text-amber-400">#{current.ticket_external_id}</p>
            <p className="text-sm text-slate-200 truncate">{current.ticket_subject}</p>
          </div>
          {pending.length > 1 && (
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">
              +{pending.length - 1}
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-brand-border flex justify-end gap-2">
          <button
            disabled={isPending}
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors disabled:opacity-50"
          >
            {t('notifications.assignment.confirm')}
          </button>
          <button
            disabled={isPending}
            onClick={handleViewTicket}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-purple hover:bg-brand-purple/90 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-lg shadow-brand-purple/20 transition-all"
          >
            {t('notifications.assignment.viewTicket')}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
