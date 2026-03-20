import { useRef, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Clock, RefreshCw, ExternalLink, UserCircle, Send } from 'lucide-react'
import {
  useTicket,
  useUpdateTicketStatus,
  useAssignTicket,
  useUsers,
  useMessages,
  useSendMessage,
} from '../hooks/useTickets'
import { markTicketAsViewed } from '../hooks/useInboundNotifications'
import { StatusBadge } from '../components/inbox/StatusBadge'
import { PriorityBadge } from '../components/inbox/PriorityBadge'
import { TypeBadge } from '../components/inbox/TypeBadge'
import { SlaBadge } from '../components/inbox/SlaBadge'
import { NotesPanel } from '../components/inbox/NotesPanel'
import { AttachmentsPanel } from '../components/inbox/AttachmentsPanel'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress', 'cancelled'],
  in_progress: ['waiting_client', 'resolved', 'cancelled'],
  waiting_client: ['in_progress', 'resolved', 'cancelled'],
  resolved: ['open'],
  closed: [],
  cancelled: [],
}

const STATUS_ACTION_LABEL: Record<string, string> = {
  in_progress: 'status.action.startProgress',
  waiting_client: 'status.action.waitClient',
  resolved: 'status.action.resolve',
  cancelled: 'status.action.cancel',
  open: 'status.action.reopen',
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

function formatTime(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
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
        {payload && Object.keys(payload).length > 0 && (
          <pre className="text-xs font-mono text-slate-400 overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(payload, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const ticketId = Number(id)
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  const { data: ticket, isLoading } = useTicket(ticketId)
  const updateStatus = useUpdateTicketStatus(ticketId)
  const assignTicket = useAssignTicket(ticketId)
  const { data: users = [] } = useUsers()
  const { data: messages = [] } = useMessages(ticketId)
  const { mutate: sendMessage, isPending: sendPending } = useSendMessage(ticketId)

  const [replyBody, setReplyBody] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Mark ticket as viewed so the unread dot clears and notifications stop for this ticket
  useEffect(() => {
    markTicketAsViewed(ticketId)
  }, [ticketId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = replyBody.trim()
    if (!trimmed) return
    sendMessage({ body: trimmed }, { onSuccess: () => setReplyBody('') })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend(e as unknown as React.FormEvent)
    }
  }

  if (isLoading || !ticket) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-slate-500 font-mono animate-pulse">
          {t('inbox.detail.loading')}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-brand-border bg-brand-dark">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('inbox.detail.back')}
        </button>
        <div className="w-px h-4 bg-brand-border" />
        <span className="text-xs font-mono text-slate-300 bg-white/5 border border-white/15 px-2 py-0.5 rounded">
          {ticket.source_name}
        </span>
        <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          #{ticket.external_id}
        </span>
        <div className="flex items-center gap-1.5 ml-1 flex-wrap">
          {ticket.type && <TypeBadge type={ticket.type} />}
          {ticket.priority && <PriorityBadge priority={ticket.priority} />}
          <StatusBadge status={ticket.status} />
          <SlaBadge status={ticket.sla_status} dueAt={ticket.sla_due_at} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex">
        {/* Left: conversation */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-brand-border">
          <div className="px-6 py-3 border-b border-brand-border/50 shrink-0">
            <h1 className="text-base font-semibold text-white leading-snug">{ticket.subject}</h1>
          </div>

          {/* Messages thread — scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
            {messages.length === 0 ? (
              <p className="text-xs text-slate-500 italic">{t('inbox.detail.noMessages')}</p>
            ) : (
              messages.map((msg) => {
                const isOutbound = msg.direction === 'outbound'
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-1 ${isOutbound ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isOutbound
                          ? 'bg-brand-accent/20 border border-brand-accent/25 text-slate-100'
                          : 'bg-white/5 border border-white/10 text-slate-200'
                      }`}
                    >
                      {msg.body}
                    </div>
                    <div className={`flex items-center gap-1.5 ${isOutbound ? 'flex-row-reverse' : ''}`}>
                      <span className="text-[10px] font-medium text-slate-400">{msg.author_name}</span>
                      <span className="text-[10px] text-slate-600">·</span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {formatTime(msg.created_at, locale)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply input — sticky at bottom */}
          <form
            onSubmit={handleSend}
            className="shrink-0 px-6 py-4 border-t border-brand-border/50 bg-brand-dark"
          >
            <div className="flex gap-3 items-end">
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('inbox.detail.replyPlaceholder')}
                rows={3}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:border-brand-accent"
              />
              <button
                type="submit"
                disabled={sendPending || !replyBody.trim()}
                className="p-2.5 rounded-lg bg-brand-accent text-white hover:bg-brand-accent/90 disabled:opacity-40 transition-colors shrink-0"
                title={t('inbox.detail.send')}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5">{t('inbox.detail.replyHint')}</p>
          </form>
        </div>

        {/* Right: metadata + notes + history */}
        <div className="w-96 shrink-0 overflow-y-auto bg-brand-dark border-l border-brand-border">
          {/* Metadata */}
          <div className="px-5 py-5 border-b border-brand-border/50 space-y-4">
            {/* Status actions */}
            {(ALLOWED_TRANSITIONS[ticket.status] ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(ALLOWED_TRANSITIONS[ticket.status] ?? []).map((next) => (
                  <button
                    key={next}
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ status: next })}
                    className="text-xs font-semibold px-3 py-1 rounded border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t(STATUS_ACTION_LABEL[next] ?? next)}
                  </button>
                ))}
              </div>
            )}

            {/* Assignee */}
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

            {/* Dates */}
            <div className="space-y-2">
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

            {/* Description */}
            {ticket.description && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
                  {t('inbox.detail.description')}
                </p>
                <p className="text-sm text-slate-300 leading-relaxed bg-white/5 border border-white/10 rounded-lg p-3">
                  {ticket.description}
                </p>
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="border-b border-brand-border/50">
            <AttachmentsPanel ticketId={ticket.id} />
          </div>

          {/* Notes */}
          <div className="border-b border-brand-border/50">
            <NotesPanel ticketId={ticket.id} locale={locale} />
          </div>

          {/* Event history */}
          <div className="px-5 py-4">
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
      </div>
    </div>
  )
}
