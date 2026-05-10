import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Clock, RefreshCw, ExternalLink, UserCircle, GitMerge, GitBranch, CalendarClock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTicket, useUpdateTicketStatus, useAssignTicket, useUsers } from '../../hooks/useTickets'
import { StatusBadge } from './StatusBadge'
import { PriorityBadge } from './PriorityBadge'
import { TypeBadge } from './TypeBadge'
import { ConversationPanel } from './ConversationPanel'
import { SlaBadge } from './SlaBadge'
import { MergeTicketModal } from './MergeTicketModal'
import TagSelector from './TagSelector'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress', 'cancelled'],
  in_progress: ['waiting_client', 'pending_closure', 'cancelled'],
  waiting_client: ['in_progress', 'pending_closure', 'cancelled'],
  pending_closure: ['in_progress', 'closed'],
  resolved: ['open'],
  closed: [],
  cancelled: [],
  merged: [],
}

const STATUS_ACTION_LABEL: Record<string, string> = {
  in_progress: 'status.action.startProgress',
  waiting_client: 'status.action.waitClient',
  pending_closure: 'status.action.pendingClosure',
  resolved: 'status.action.resolve',
  cancelled: 'status.action.cancel',
  open: 'status.action.reopen',
  closed: 'status.action.close',
}

function DeploymentModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (deploymentAt: string | null, prNumber: string | null) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [deploymentAt, setDeploymentAt] = useState('')
  const [prNumber, setPrNumber] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-brand-dark border border-brand-border rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-slate-100">{t('inbox.detail.deployment.modalTitle')}</h2>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-xs text-slate-400">{t('inbox.detail.deployment.modalHint')}</p>

          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('inbox.detail.deployment.scheduledAt')}</label>
            <input
              type="datetime-local"
              value={deploymentAt}
              onChange={(e) => setDeploymentAt(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('inbox.detail.deployment.prNumber')}</label>
            <input
              type="text"
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
              placeholder={t('inbox.detail.deployment.prPlaceholder')}
              className="w-full bg-brand-surface border border-brand-border rounded-md px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-brand-border">
          <button
            type="button"
            onClick={() => onConfirm(null, null)}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            {t('inbox.detail.deployment.skipInfo')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(deploymentAt || null, prNumber || null)}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-md transition-colors"
          >
            {t('inbox.detail.deployment.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

interface TicketDetailProps {
  ticketId: number
  onClose: () => void
}

function formatDate(iso: string | null, locale: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function EventDescription({
  type,
  payload,
}: {
  type: string
  payload: Record<string, unknown> | null
}) {
  const { t } = useTranslation()

  if (!payload || Object.keys(payload).length === 0) return null

  switch (type) {
    case 'assigned': {
      const assignedBy = payload.assigned_by as string | undefined
      const assignedTo = payload.assigned_to as string | null | undefined
      const previous = payload.previous_assignee as string | undefined
      if (!assignedBy) break
      return (
        <div className="text-xs text-slate-300 space-y-0.5">
          <p>
            {assignedTo
              ? t('inbox.detail.events.assigned', { assigned_by: assignedBy, assigned_to: assignedTo })
              : t('inbox.detail.events.unassigned', { assigned_by: assignedBy })}
          </p>
          {previous && (
            <p className="text-[11px] text-slate-500">
              {t('inbox.detail.events.assigned_previous', { previous_assignee: previous })}
            </p>
          )}
        </div>
      )
    }
    case 'status_changed': {
      const from = (payload.from ?? payload.old_status) as string | undefined
      const to = (payload.to ?? payload.new_status) as string | undefined
      const by = payload.changed_by as string | undefined
      if (!from || !to) break
      return (
        <div className="text-xs text-slate-300 space-y-0.5">
          <p>{t('inbox.detail.events.status_changed', { from, to })}</p>
          {by && <p className="text-[11px] text-slate-500">{t('inbox.detail.events.by', { name: by })}</p>}
        </div>
      )
    }
    case 'priority_changed': {
      const from = payload.old_priority as string | undefined
      const to = payload.new_priority as string | undefined
      const by = payload.changed_by as string | undefined
      if (!from || !to) break
      return (
        <div className="text-xs text-slate-300 space-y-0.5">
          <p>{t('inbox.detail.events.priority_changed', { from, to })}</p>
          {by && <p className="text-[11px] text-slate-500">{t('inbox.detail.events.by', { name: by })}</p>}
        </div>
      )
    }
    case 'deployment_scheduled': {
      const at = payload.deployment_at as string | undefined
      const pr = payload.pr_number as string | undefined
      if (!at) break
      return (
        <div className="text-xs text-amber-300 space-y-0.5">
          <p>{t('inbox.detail.events.deployment_scheduled', { at: new Date(at).toLocaleString() })}</p>
          {pr && <p className="text-[11px] text-amber-500">{t('inbox.detail.events.pr_number', { pr })}</p>}
        </div>
      )
    }
  }

  return (
    <pre className="text-xs font-mono text-slate-400 overflow-x-auto whitespace-pre-wrap break-all">
      {JSON.stringify(payload, null, 2)}
    </pre>
  )
}

function EventItem({
  type,
  payload,
  date,
  locale,
}: {
  type: string
  payload: Record<string, unknown> | null
  date: string
  locale: string
}) {
  return (
    <div className="relative pl-4 pb-4">
      <div className="absolute left-0 top-1.5 bottom-0 w-px bg-brand-border" />
      <div className="absolute left-[-3px] top-1.5 w-1.5 h-1.5 rounded-full bg-brand-purple border border-brand-dark" />
      <div className="bg-white/5 border border-white/10 rounded-lg p-3 ml-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono text-brand-purple font-semibold uppercase tracking-wider">
            {type}
          </span>
          <span className="text-xs font-mono text-slate-400">{formatDate(date, locale)}</span>
        </div>
        <EventDescription type={type} payload={payload} />
      </div>
    </div>
  )
}

export function TicketDetail({ ticketId, onClose }: TicketDetailProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const navigate = useNavigate()
  const { data: ticket, isLoading } = useTicket(ticketId)
  const updateStatus = useUpdateTicketStatus(ticketId)
  const assignTicket = useAssignTicket(ticketId)
  const { data: users = [] } = useUsers()
  const [showMergeModal, setShowMergeModal] = useState(false)

  const [showDeploymentModal, setShowDeploymentModal] = useState(false)

  const isMergeable = ticket
    && ticket.status !== 'merged'
    && ticket.status !== 'closed'
    && ticket.status !== 'cancelled'

  return (
    <>
    <div className="flex flex-col h-full border-l border-brand-border bg-brand-dark">
      <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border shrink-0">
        <span className="text-xs font-mono text-slate-400">{t('inbox.detail.title')}</span>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-100 transition-colors rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isLoading || !ticket ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm text-slate-500 font-mono animate-pulse">
            {t('inbox.detail.loading')}
          </span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 border-b border-brand-border/50">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-mono text-slate-300 bg-white/5 border border-white/15 px-2 py-0.5 rounded">
                {ticket.source_name}
              </span>
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                #{ticket.external_id}
              </span>
            </div>

            <h2 className="text-base font-semibold text-white leading-snug mb-3">
              {ticket.subject}
            </h2>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {ticket.type && <TypeBadge type={ticket.type} />}
              {ticket.priority && <PriorityBadge priority={ticket.priority} />}
              <StatusBadge status={ticket.status} />
              <SlaBadge status={ticket.sla_status} dueAt={ticket.sla_due_at} />
            </div>

            <div className="mb-4 bg-brand-border/10 p-2 rounded-lg border border-white/5">
              <TagSelector ticketId={ticket.id} currentTags={ticket.tags || []} />
            </div>

            {(ALLOWED_TRANSITIONS[ticket.status] ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(ALLOWED_TRANSITIONS[ticket.status] ?? []).map((next) => (
                  <button
                    key={next}
                    disabled={updateStatus.isPending}
                    onClick={() => {
                      if (next === 'pending_closure') {
                        setShowDeploymentModal(true)
                      } else {
                        updateStatus.mutate({ status: next })
                      }
                    }}
                    className="text-xs font-semibold px-3 py-1 rounded border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t(STATUS_ACTION_LABEL[next] ?? next)}
                  </button>
                ))}
              </div>
            )}

            {isMergeable && (
              <button
                type="button"
                onClick={() => setShowMergeModal(true)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-purple transition-colors mb-2"
              >
                <GitMerge className="w-3.5 h-3.5" />
                Mesclar com outro ticket
              </button>
            )}

            {ticket.status === 'merged' && (
              <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg">
                <GitMerge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-xs text-slate-400">Este ticket foi mesclado em outro.</span>
              </div>
            )}

            {ticket.description && (
              <p className="text-sm text-slate-300 leading-relaxed bg-white/5 border border-white/10 rounded-lg p-3 mt-3">
                {ticket.description}
              </p>
            )}
          </div>

          <div className="px-5 py-4 border-b border-brand-border/50 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <UserCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="shrink-0">{t('inbox.detail.assignedTo')}:</span>
              <select
                disabled={assignTicket.isPending}
                value={ticket.assigned_to?.id ?? ''}
                onChange={(e) =>
                  assignTicket.mutate({
                    user_id: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                className="flex-1 bg-brand-surface border border-white/15 rounded px-2 py-0.5 text-xs text-slate-200 cursor-pointer focus:outline-none focus:border-brand-purple disabled:opacity-50"
              >
                <option value="">{t('inbox.detail.unassigned')}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            {ticket.deployment_scheduled_at && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CalendarClock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>
                  {t('inbox.detail.deployment.scheduledAt')}:{' '}
                  <span className="text-amber-300 font-mono">
                    {formatDate(ticket.deployment_scheduled_at, locale)}
                  </span>
                </span>
              </div>
            )}
            {ticket.pr_number && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <GitBranch className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>
                  {t('inbox.detail.deployment.prNumber')}:{' '}
                  <span className="text-amber-300 font-mono">{ticket.pr_number}</span>
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {t('inbox.detail.createdAt')}:{' '}
                <span className="text-slate-300 font-mono">
                  {formatDate(ticket.source_created_at, locale)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>
                {t('inbox.detail.updatedAt')}:{' '}
                <span className="text-slate-300 font-mono">
                  {formatDate(ticket.source_updated_at, locale)}
                </span>
              </span>
            </div>
          </div>

          <div className="border-t border-brand-border/50">
            <ConversationPanel ticketId={ticket.id} locale={locale} />
          </div>

          <div className="px-5 py-4 border-t border-brand-border/50">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
              {t('inbox.detail.eventHistory')}
            </h3>
            {ticket.events.length === 0 ? (
              <p className="text-sm text-slate-500 font-mono">{t('inbox.detail.noEvents')}</p>
            ) : (
              <div>
                {ticket.events.map((ev) => (
                  <EventItem
                    key={ev.id}
                    type={ev.event_type}
                    payload={ev.payload}
                    date={ev.occurred_at}
                    locale={locale}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {showDeploymentModal && ticket && (
      <DeploymentModal
        onConfirm={(deploymentAt, prNumber) => {
          setShowDeploymentModal(false)
          updateStatus.mutate({
            status: 'pending_closure',
            deployment_scheduled_at: deploymentAt,
            pr_number: prNumber,
          })
        }}
        onCancel={() => setShowDeploymentModal(false)}
      />
    )}

    {showMergeModal && ticket && (
      <MergeTicketModal
        sourceTicket={ticket}
        onClose={() => setShowMergeModal(false)}
        onMerged={(targetId) => {
          setShowMergeModal(false)
          onClose()
          navigate(`/tickets/${targetId}`)
        }}
      />
    )}
    </>
  )
}
