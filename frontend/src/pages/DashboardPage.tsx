import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  MessageSquare,
  UserX,
  Users,
  CalendarDays,
  Timer,
  ShieldCheck,
} from 'lucide-react'
import {
  useDashboardStats,
  useAgentMonitor,
  type AgentMonitorEntry,
  type AgentMonitorTicket,
  type OverdueTicketItem,
  type UnassignedTicketItem,
  type AgentStat,
} from '../hooks/useDashboard'
import { useMe } from '../hooks/useAuth'
import { useUsers, useAssignTicket } from '../hooks/useTickets'
import { useQueryClient } from '@tanstack/react-query'

const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low']

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-500/15 text-red-400 border-red-500/20',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
}

const PRIORITY_CELL_STYLES: Record<string, string> = {
  urgent: 'bg-red-500/15 text-red-400',
  high: 'bg-orange-500/15 text-orange-400',
  medium: 'bg-yellow-500/15 text-yellow-400',
  low: 'bg-emerald-500/15 text-emerald-400',
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { data: user } = useMe()
  const { data: stats, isLoading } = useDashboardStats()

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-slate-500">{t('settings.forbidden')}</p>
      </div>
    )
  }

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-slate-500 animate-pulse">{t('inbox.loading')}</p>
      </div>
    )
  }

  const maxClientOpen = stats.by_client[0]?.open ?? 1

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Alert banner */}
      {stats.overdue > 0 && (
        <div className="flex items-center gap-3 bg-red-950/40 border border-red-500/30 rounded-xl px-5 py-3">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-red-300">
              {t('dashboard.alert.overdue', { count: stats.overdue })}
            </span>
            <span className="text-xs text-red-500 ml-2">{t('dashboard.alert.overdueHint')}</span>
          </div>
          <a
            href="#overdue"
            className="text-xs font-semibold text-red-400 hover:text-red-200 transition-colors shrink-0"
          >
            {t('dashboard.alert.view')} →
          </a>
        </div>
      )}

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t('dashboard.kpi.totalOpen')}
          value={stats.total_open}
          icon={<Inbox className="w-5 h-5 text-blue-400" />}
          iconBg="bg-blue-500/10"
        />
        <KpiCard
          label={t('dashboard.kpi.overdue')}
          value={stats.overdue}
          valueClass={stats.overdue > 0 ? 'text-red-400' : 'text-slate-200'}
          icon={<Clock className="w-5 h-5 text-red-400" />}
          iconBg="bg-red-500/10"
          pulse={stats.overdue > 0}
          sub={
            stats.total_open > 0
              ? `${Math.round((stats.overdue / stats.total_open) * 100)}% ${t('dashboard.kpi.ofTotal')}`
              : undefined
          }
        />
        <KpiCard
          label={t('dashboard.kpi.unassigned')}
          value={stats.unassigned}
          valueClass={stats.unassigned > 0 ? 'text-orange-400' : 'text-slate-200'}
          icon={<UserX className="w-5 h-5 text-orange-400" />}
          iconBg="bg-orange-500/10"
          sub={t('dashboard.kpi.unassignedHint')}
        />
        <KpiCard
          label={t('dashboard.kpi.waitingClient')}
          value={stats.waiting_client}
          valueClass="text-amber-400"
          icon={<Users className="w-5 h-5 text-amber-400" />}
          iconBg="bg-amber-500/10"
        />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t('dashboard.kpi.openedToday')}
          value={stats.opened_today}
          valueClass="text-brand-accent"
          icon={<CalendarDays className="w-5 h-5 text-brand-accent" />}
          iconBg="bg-brand-accent/10"
        />
        <KpiCard
          label={t('dashboard.kpi.resolvedToday')}
          value={stats.resolved_today}
          valueClass="text-emerald-400"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          iconBg="bg-emerald-500/10"
        />
        <KpiCard
          label={t('dashboard.kpi.slaCompliance')}
          value={stats.sla_compliance_pct !== null ? `${stats.sla_compliance_pct}%` : '—'}
          valueClass={
            stats.sla_compliance_pct === null
              ? 'text-slate-500'
              : stats.sla_compliance_pct >= 80
                ? 'text-emerald-400'
                : stats.sla_compliance_pct >= 60
                  ? 'text-yellow-400'
                  : 'text-red-400'
          }
          icon={<ShieldCheck className="w-5 h-5 text-slate-400" />}
          iconBg="bg-slate-500/10"
          sub={t('dashboard.kpi.slaTarget')}
        />
        <KpiCard
          label={t('dashboard.kpi.mttr')}
          value={stats.mttr_hours !== null ? `${stats.mttr_hours}h` : '—'}
          valueClass={stats.mttr_hours !== null ? 'text-slate-200' : 'text-slate-500'}
          icon={<Timer className="w-5 h-5 text-slate-400" />}
          iconBg="bg-slate-500/10"
          sub={t('dashboard.kpi.mttrPeriod')}
        />
      </div>

      {/* Middle row: Agent workload + Client/Priority breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent workload table */}
        <div className="lg:col-span-2 bg-brand-surface border border-brand-border rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-200">{t('dashboard.agents.title')}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{t('dashboard.agents.subtitle')}</p>
          </div>
          <AgentTable agents={stats.by_agent} t={t} />
        </div>

        {/* By client + By priority */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-5 space-y-6">
          {/* Volume por cliente */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-3">
              {t('dashboard.byClient.title')}
            </h3>
            {stats.by_client.length === 0 ? (
              <p className="text-xs text-slate-500">{t('inbox.empty')}</p>
            ) : (
              <div className="space-y-2">
                {stats.by_client.map((c) => (
                  <div key={c.source_id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-28 shrink-0 truncate">{c.name}</span>
                    <div className="flex-1 h-4 bg-slate-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-brand-accent/60 rounded transition-all duration-500"
                        style={{ width: `${Math.max(4, (c.open / maxClientOpen) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-300 w-5 text-right shrink-0">
                      {c.open}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Por prioridade */}
          <div className="pt-4 border-t border-brand-border">
            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
              {t('dashboard.byPriority.title')}
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITY_ORDER.map((p) => {
                const found = stats.by_priority.find((b) => b.priority === p)
                return (
                  <div key={p} className="text-center">
                    <div
                      className={`mx-auto w-11 h-11 rounded-lg flex items-center justify-center text-sm font-bold ${PRIORITY_CELL_STYLES[p] ?? 'bg-slate-800 text-slate-400'}`}
                    >
                      {found?.count ?? 0}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5">
                      {t(`priority.${p.toUpperCase()}`)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Monitor */}
      <AgentMonitorSection t={t} />

      {/* Overdue + Unassigned side by side when both exist, stacked otherwise */}
      <div className={`grid gap-6 ${stats.overdue_tickets.length > 0 && stats.unassigned_tickets.length > 0 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {stats.overdue_tickets.length > 0 && (
          <div id="overdue" className="bg-brand-surface border border-red-500/20 rounded-xl p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                {t('dashboard.overdue.title')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{t('dashboard.overdue.subtitle')}</p>
            </div>
            <div className="space-y-2">
              {stats.overdue_tickets.map((ticket) => (
                <OverdueRow key={ticket.id} ticket={ticket} t={t} />
              ))}
            </div>
          </div>
        )}

        {stats.unassigned_tickets.length > 0 && (
          <div className="bg-brand-surface border border-orange-500/20 rounded-xl p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <UserX className="w-4 h-4 text-orange-400" />
                {t('dashboard.unassigned.title')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{t('dashboard.unassigned.subtitle')}</p>
            </div>
            <div className="space-y-2">
              {stats.unassigned_tickets.map((ticket) => (
                <UnassignedRow key={ticket.id} ticket={ticket} t={t} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string | number
  valueClass?: string
  icon: React.ReactNode
  iconBg: string
  sub?: string
  pulse?: boolean
}

function KpiCard({ label, value, valueClass = 'text-slate-200', icon, iconBg, sub, pulse }: KpiCardProps) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${valueClass}`}>{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg} ${pulse ? 'animate-pulse' : ''}`}>
          {icon}
        </div>
      </div>
      {sub && <p className="text-xs text-slate-500 mt-3">{sub}</p>}
    </div>
  )
}

interface AgentTableProps {
  agents: AgentStat[]
  t: (key: string) => string
}

function AgentTable({ agents, t }: AgentTableProps) {
  if (agents.length === 0) {
    return <p className="text-xs text-slate-500">{t('dashboard.agents.empty')}</p>
  }

  const initials = (name: string) =>
    name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase()

  const avatarColors = [
    'bg-brand-accent/20 text-brand-accent',
    'bg-emerald-500/20 text-emerald-400',
    'bg-purple-500/20 text-purple-400',
    'bg-orange-500/20 text-orange-400',
    'bg-pink-500/20 text-pink-400',
    'bg-sky-500/20 text-sky-400',
  ]

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left border-b border-slate-700/50">
          <th className="pb-3 font-medium text-slate-500">{t('dashboard.agents.colAgent')}</th>
          <th className="pb-3 font-medium text-slate-500 text-center">{t('dashboard.agents.colOpen')}</th>
          <th className="pb-3 font-medium text-slate-500 text-center">{t('dashboard.agents.colOverdue')}</th>
          <th className="pb-3 font-medium text-slate-500 text-center hidden sm:table-cell">
            {t('dashboard.agents.colResolved')}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800">
        {agents.map((agent, i) => (
          <tr key={agent.user_id}>
            <td className="py-3 flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold shrink-0 text-[11px] ${avatarColors[i % avatarColors.length]}`}
              >
                {initials(agent.name)}
              </div>
              <span className="font-medium text-slate-300">{agent.name}</span>
            </td>
            <td className="py-3 text-center font-semibold text-slate-200">{agent.open}</td>
            <td className="py-3 text-center">
              {agent.overdue > 0 ? (
                <span className="font-bold text-red-400">{agent.overdue}</span>
              ) : (
                <span className="text-slate-600">0</span>
              )}
            </td>
            <td className="py-3 text-center text-slate-400 hidden sm:table-cell">
              {agent.resolved_period}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface UnassignedRowProps {
  ticket: UnassignedTicketItem
  t: (key: string) => string
}

function UnassignedRow({ ticket, t }: UnassignedRowProps) {
  const queryClient = useQueryClient()
  const { data: users } = useUsers()
  const { mutate: assign, isPending } = useAssignTicket(ticket.id)

  const handleAssign = (userId: string) => {
    if (!userId) return
    assign(
      { user_id: Number(userId) },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        },
      },
    )
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-orange-950/20 border-orange-500/15">
      <div className="shrink-0 mt-0.5">
        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
          {ticket.external_id}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate">{ticket.subject}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="text-xs text-slate-400">{ticket.source_name}</span>
          {ticket.priority && (
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${PRIORITY_STYLES[ticket.priority] ?? 'bg-slate-700 text-slate-400 border-slate-600'}`}
            >
              {t(`priority.${ticket.priority.toUpperCase()}`)}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0">
        <select
          defaultValue=""
          disabled={isPending}
          onChange={(e) => handleAssign(e.target.value)}
          className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-300 focus:outline-none focus:border-brand-accent disabled:opacity-50"
        >
          <option value="" disabled>
            {t('dashboard.unassigned.assign')}
          </option>
          {users?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ── Agent Monitor ────────────────────────────────────────────────────────────

const SLA_BADGE: Record<string, string> = {
  ok: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  at_risk: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  overdue: 'bg-red-500/15 text-red-400 border-red-500/30',
  paused: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
}

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-slate-700 text-slate-300',
  in_progress: 'bg-blue-500/15 text-blue-400',
  waiting_client: 'bg-amber-500/15 text-amber-400',
}

function formatTimeAgo(isoDate: string, t: (key: string) => string): string {
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60_000)
  if (diff < 60) return `${diff}min`
  if (diff < 1440) return `${Math.floor(diff / 60)}h`
  return `${Math.floor(diff / 1440)}d`
}

interface AgentMonitorSectionProps {
  t: (key: string, opts?: Record<string, unknown>) => string
}

function AgentMonitorSection({ t }: AgentMonitorSectionProps) {
  const { data, isLoading } = useAgentMonitor()

  if (isLoading) return null

  const agents = data?.agents.filter((a) => a.tickets.length > 0) ?? []

  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">{t('dashboard.monitor.title')}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{t('dashboard.monitor.subtitle')}</p>
        </div>
        <span className="text-xs text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">
          {agents.reduce((s, a) => s + a.tickets.length, 0)} {t('dashboard.kpi.totalOpen').toLowerCase()}
        </span>
      </div>

      {agents.length === 0 ? (
        <p className="text-xs text-slate-500 py-2">{t('dashboard.monitor.empty')}</p>
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

const AVATAR_COLORS = [
  'bg-brand-accent/20 text-brand-accent',
  'bg-emerald-500/20 text-emerald-400',
  'bg-purple-500/20 text-purple-400',
  'bg-orange-500/20 text-orange-400',
  'bg-pink-500/20 text-pink-400',
  'bg-sky-500/20 text-sky-400',
]

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
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
      {/* Agent header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/40 border-b border-slate-700/50">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
        >
          {initials(agent.name)}
        </div>
        <span className="text-sm font-semibold text-slate-200 flex-1 min-w-0 truncate">
          {agent.name}
        </span>
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

      {/* Ticket list */}
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
      {/* Priority dot */}
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          ticket.priority === 'urgent' ? 'bg-red-400' :
          ticket.priority === 'high' ? 'bg-orange-400' :
          ticket.priority === 'medium' ? 'bg-yellow-400' : 'bg-emerald-400'
        }`}
      />

      {/* ID */}
      <span className="text-[10px] font-bold text-slate-500 shrink-0 w-24 truncate">
        {ticket.external_id}
      </span>

      {/* Subject */}
      <span className="text-xs text-slate-300 flex-1 min-w-0 truncate group-hover:text-slate-100">
        {ticket.subject}
      </span>

      {/* Indicators */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Unanswered message */}
        {ticket.has_unanswered_message && (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded"
            title={t('dashboard.monitor.unanswered')}
          >
            <MessageSquare className="w-3 h-3" />
            {ticket.last_message_at && formatTimeAgo(ticket.last_message_at, t)}
          </span>
        )}

        {/* Waiting since (waiting_client status) */}
        {ticket.status === 'waiting_client' && ticket.waiting_since && (
          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
            ⏸ {formatTimeAgo(ticket.waiting_since, t)}
          </span>
        )}

        {/* SLA badge */}
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

interface OverdueRowProps {
  ticket: OverdueTicketItem
  t: (key: string) => string
}

function OverdueRow({ ticket, t }: OverdueRowProps) {
  const isCritical = ticket.hours_overdue >= 24
  const borderClass = isCritical
    ? 'bg-red-950/30 border-red-500/20'
    : 'bg-orange-950/20 border-orange-500/20'

  return (
    <div className={`flex items-start gap-4 p-3 rounded-lg border ${borderClass}`}>
      <div className="shrink-0 mt-0.5">
        <span
          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${isCritical ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'}`}
        >
          {ticket.external_id}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate">{ticket.subject}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="text-xs text-slate-400">{ticket.source_name}</span>
          {ticket.priority && (
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${PRIORITY_STYLES[ticket.priority] ?? 'bg-slate-700 text-slate-400 border-slate-600'}`}
            >
              {t(`priority.${ticket.priority.toUpperCase()}`)}
            </span>
          )}
          <span className={`text-xs font-semibold ${isCritical ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>
            ● {ticket.hours_overdue}h {t('dashboard.overdue.late')}
          </span>
          {ticket.assigned_to_name ? (
            <span className="text-xs text-slate-400">{ticket.assigned_to_name}</span>
          ) : (
            <span className="text-xs text-slate-500 italic">{t('inbox.detail.unassigned')}</span>
          )}
        </div>
      </div>
    </div>
  )
}
