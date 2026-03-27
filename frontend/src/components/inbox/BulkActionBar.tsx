import { useTranslation } from 'react-i18next'
import { X, UserPlus, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { useBulkUpdateTickets, useUsers } from '../../hooks/useTickets'

interface BulkActionBarProps {
  selectedIds: number[]
  onClear: () => void
}

export function BulkActionBar({ selectedIds, onClear }: BulkActionBarProps) {
  const { t } = useTranslation()
  const { data: users } = useUsers()
  const { mutate: bulkUpdate, isPending } = useBulkUpdateTickets()

  if (selectedIds.length === 0) return null

  const handleUpdate = (payload: { status?: string; priority?: string; assigned_to_user_id?: number | null }) => {
    bulkUpdate(
      { ticket_ids: selectedIds, ...payload },
      {
        onSuccess: () => {
          onClear()
        },
      }
    )
  }

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="bg-brand-surface border border-brand-border shadow-2xl rounded-xl px-4 py-3 flex items-center gap-6 min-w-[500px]">
        {/* Count & Clear */}
        <div className="flex items-center gap-3 pr-6 border-r border-brand-border/50">
          <div className="bg-brand-purple text-white text-xs font-bold px-2 py-1 rounded-md min-w-[1.5rem] text-center">
            {selectedIds.length}
          </div>
          <span className="text-sm font-medium text-slate-200">
            {t('inbox.bulk.selected', { count: selectedIds.length })}
          </span>
          <button
            onClick={onClear}
            className="p-1 hover:bg-white/5 rounded-md text-slate-500 hover:text-slate-300 transition-colors"
            title={t('common.clear')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-1">
          {isPending ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm animate-pulse ml-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('common.processing')}...
            </div>
          ) : (
            <>
              {/* Assign to... */}
              <div className="relative group">
                <button
                  id="bulk-assign-button"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors focus:ring-2 focus:ring-brand-purple focus:outline-none"
                >
                  <UserPlus className="w-4 h-4" />
                  {t('inbox.bulk.shortcutAssign')}
                </button>
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-brand-surface border border-brand-border shadow-xl rounded-lg overflow-hidden hidden group-hover:block group-focus-within:block animate-in fade-in slide-in-from-bottom-2">
                  <div className="max-h-48 overflow-y-auto p-1">
                    <button
                      onClick={() => handleUpdate({ assigned_to_user_id: null })}
                      className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white rounded-md transition-colors"
                    >
                      {t('inbox.bulk.unassign')}
                    </button>
                    <div className="h-px bg-brand-border/50 my-1" />
                    {users?.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleUpdate({ assigned_to_user_id: u.id })}
                        className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white rounded-md transition-colors truncate"
                      >
                        {u.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status... */}
              <div className="relative group">
                <button
                  id="bulk-status-button"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors focus:ring-2 focus:ring-brand-purple focus:outline-none"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {t('inbox.bulk.shortcutStatus')}
                </button>
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-brand-surface border border-brand-border shadow-xl rounded-lg overflow-hidden hidden group-hover:block group-focus-within:block animate-in fade-in slide-in-from-bottom-2">
                  <div className="p-1 space-y-0.5">
                    {['in_progress', 'waiting_client', 'pending_closure', 'closed', 'cancelled'].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleUpdate({ status: s })}
                        className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white rounded-md transition-colors"
                      >
                        {t(`status.${s.toUpperCase()}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Priority... */}
              <div className="relative group">
                <button
                  id="bulk-priority-button"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors focus:ring-2 focus:ring-brand-purple focus:outline-none"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {t('inbox.bulk.shortcutPriority')}
                </button>
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-brand-surface border border-brand-border shadow-xl rounded-lg overflow-hidden hidden group-hover:block group-focus-within:block animate-in fade-in slide-in-from-bottom-2">
                  <div className="p-1 space-y-0.5">
                    {['urgent', 'high', 'medium', 'low'].map((p) => (
                      <button
                        key={p}
                        onClick={() => handleUpdate({ priority: p })}
                        className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white rounded-md transition-colors"
                      >
                        {t(`priority.${p.toUpperCase()}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
