import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { useAgentMonitor, type AgentMonitorEntry, type AgentMonitorTicket } from '../../hooks/useDashboard'

const SLA_BADGE: Record<string, string> = {
  ok:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  at_risk: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  overdue: 'bg-red-500/15 text-red-400 border-red-500/30',
  paused:  'bg-sky-500/15 text-sky-400 border-sky-500/30',
}

const AVATAR_COLORS = [
  'bg-brand-accent/20 text-brand-accent',
  'bg-emerald-500/20 text-emerald-400',
  'bg-purple-500/20 text-purple-400',
  'bg-orange-500/20 text-orange-400',
  'bg-pink-500/20 text-pink-400',
  'bg-sky-500/20 text-sky-400',
]

function formatTimeAgo(isoDate: string): string {
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60_000)
  if (diff < 60) return `${diff}min`
  if (diff < 1440) return `${Math.floor(diff / 60)}h`
  return `${Math.floor(diff / 1440)}d`
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

interface AgentMonitorCardProps {
  agent: AgentMonitorEntry
  index: number
  t: (key: string, opts?: Record<string, unknown>) => string
}

function AgentMonitorCard({ agent, index, t }: AgentMonitorCardProps) {
  const overdue = agent.tickets.filter((tk) => tk.sla_status === 'overdue').length
  const unanswered = agent.tickets.filter((tk) => tk.has_unanswered_message).length

  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/40 border-b border-slate-700/50">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
        >
          {initials(agent.name)}
        </div>
        <Link
          to={`/dashboard/agent/${agent.user_id}`}
          className="text-sm font-semibold text-slate-200 flex-1 min-w-0 truncate hover:text-violet-300 transition-colors"
        >
          {agent.name}
        </Link>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-semibold text-slate-400 bg-slate-700/60 px-2 py-0.5 rounded-full">
            {agent.tickets.length}
          </span>
          {overdue > 0 && (
            <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
              {overdue} atrasado{overdue > 1 ? 's' : ''}
            </span>
          )}
          {unanswered > 0 && (
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {unanswered}
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-800">
        {agent.tickets.map((ticket) => (
          <AgentMonitorTicketRow key={ticket.id} ticket={ticket} t={t} />
        ))}
      </div>
    </div>
  )
}

interface AgentMonitorTicketRowProps {
  ticket: AgentMonitorTicket
  t: (key: string, opts?: Record<string, unknown>) => string
}

function AgentMonitorTicketRow({ ticket, t }: AgentMonitorTicketRowProps) {
  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/40 transition-colors group"
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          ticket.priority === 'urgent'
            ? 'bg-red-400'
            : ticket.priority === 'high'
              ? 'bg-orange-400'
              : ticket.priority === 'medium'
                ? 'bg-yellow-400'
                : 'bg-emerald-400'
        }`}
      />

      <span className="text-[10px] font-bold text-slate-500 shrink-0 w-24 truncate">
        {ticket.external_id}
      </span>

      <span className="text-xs text-slate-300 flex-1 min-w-0 truncate group-hover:text-slate-100">
        {ticket.subject}
      </span>

      <div className="flex items-center gap-1.5 shrink-0">
        {ticket.has_unanswered_message && (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded"
            title={t('dashboard.monitor.unanswered')}
          >
            <MessageSquare className="w-3 h-3" />
            {ticket.last_message_at && formatTimeAgo(ticket.last_message_at)}
          </span>
        )}

        {ticket.status === 'waiting_client' && ticket.waiting_since && (
          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
            ⏸ {formatTimeAgo(ticket.waiting_since)}
          </span>
        )}

        {ticket.sla_status && (
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${SLA_BADGE[ticket.sla_status] ?? ''}`}
          >
            {t(`sla.${ticket.sla_status}`)}
          </span>
        )}
      </div>
    </Link>
  )
}

export function MonitorTab() {
  const { t } = useTranslation()
  const { data, isLoading } = useAgentMonitor()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-slate-500 animate-pulse">{t('inbox.loading')}</p>
      </div>
    )
  }

  const agents = data?.agents.filter((a) => a.tickets.length > 0) ?? []
  const totalTickets = agents.reduce((s, a) => s + a.tickets.length, 0)

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-200">{t('dashboard.monitor.title')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('dashboard.monitor.subtitle')}</p>
        </div>
        <span className="text-xs text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">
          {totalTickets} {t('dashboard.kpi.totalOpen').toLowerCase()}
        </span>
      </div>

      {agents.length === 0 ? (
        <div className="flex items-center justify-center h-48 bg-brand-surface border border-brand-border rounded-xl">
          <p className="text-sm text-slate-500">{t('dashboard.monitor.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {agents.map((agent, i) => (
            <AgentMonitorCard key={agent.user_id} agent={agent} index={i} t={t} />
          ))}
        </div>
      )}
    </div>
  )
}
