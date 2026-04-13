import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Clock, ShieldCheck, Star, Inbox, TrendingUp, Users, CalendarDays, BookOpen } from 'lucide-react'

import { useMe } from '../hooks/useAuth'
import { useAllUsers } from '../hooks/useUsers'
import { useAgentAnalytics } from '../hooks/useAnalytics'
import { useTickets } from '../hooks/useTickets'
import { useDateRange } from '../hooks/useDateRange'
import { DateRangePicker } from '../components/common/DateRangePicker'
import { Avatar } from '../components/common/Avatar'
import { PriorityBadge } from '../components/inbox/PriorityBadge'
import { StatusBadge } from '../components/inbox/StatusBadge'
import { FilterSelect } from '../components/inbox/FilterSelect'
import type { Granularity } from '../hooks/useAnalytics'
import { useCalendarEvents } from '../hooks/useCalendar'

// ── Colour palettes ───────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#f87171',
  high:   '#fb923c',
  medium: '#facc15',
  low:    '#34d399',
  unknown:'#94a3b8',
}

const TYPE_COLORS: Record<string, string> = {
  bug:         '#f87171',
  improvement: '#60a5fa',
  question:    '#a78bfa',
  support:     '#34d399',
  unknown:     '#94a3b8',
}

// ── Tooltip helpers ───────────────────────────────────────────────────────────

const PRIORITY_KEYS = ['urgent', 'high', 'medium', 'low']
const TYPE_KEYS = ['bug', 'improvement', 'question', 'support']

function ChartTooltip({ active, payload, label }: any) {
  const { t, i18n } = useTranslation()
  if (!active || !payload?.length) return null

  const translateLabel = (v: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v))
      return new Date(v).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit', year: 'numeric' })
    if (PRIORITY_KEYS.includes(v)) return t(`priority.${v.toUpperCase()}`)
    if (TYPE_KEYS.includes(v)) return t(`type.${v.toUpperCase()}`)
    return v
  }

  return (
    <div className="bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-xs shadow-lg">
      {label && <p className="text-slate-400 mb-1">{translateLabel(String(label))}</p>}
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill || p.stroke || '#a78bfa' }}>
          {p.value}
        </p>
      ))}
    </div>
  )
}

// ── KPI card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  accent?: string
}

function KpiCard({ label, value, sub, icon, accent = 'text-violet-400' }: KpiCardProps) {
  return (
    <div className="bg-white/[0.03] border border-brand-border rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</span>
        <span className={`${accent}`}>{icon}</span>
      </div>
      <span className="text-2xl font-bold text-slate-100">{value}</span>
      {sub && <span className="text-[11px] text-slate-500">{sub}</span>}
    </div>
  )
}

// ── Ticket history table ──────────────────────────────────────────────────────

const PAGE_SIZE = 15

function TicketHistory({ userId }: { userId: number }) {
  const { t } = useTranslation()
  const [activeOnly, setActiveOnly] = useState(false)
  const [page, setPage] = useState(0)
  const [priority, setPriority] = useState('')
  const [status, setStatus] = useState('')

  const { data, isLoading } = useTickets({
    assigned_to_user_id: userId,
    active_only: activeOnly || undefined,
    priority: priority || undefined,
    status: status || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const tickets = data?.items ?? []
  const total = data?.total ?? 0
  const pages = Math.ceil(total / PAGE_SIZE)

  function handleTabChange(open: boolean) {
    setActiveOnly(open)
    setPage(0)
  }

  return (
    <div className="bg-white/[0.03] border border-brand-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-brand-border">
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
          {[false, true].map((open) => (
            <button
              key={String(open)}
              onClick={() => handleTabChange(open)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeOnly === open
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {open
                ? t('agentProfile.ticketsActive')
                : t('agentProfile.ticketsAll')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <FilterSelect
            value={priority || undefined}
            onChange={(v) => { setPriority(v); setPage(0) }}
            placeholder={t('inbox.allPriorities')}
            options={['urgent','high','medium','low'].map((p) => ({
              value: p,
              label: t(`priority.${p.toUpperCase()}`),
            }))}
          />
          <FilterSelect
            value={status || undefined}
            onChange={(v) => { setStatus(v); setPage(0) }}
            placeholder={t('inbox.allStatuses')}
            options={['open','in_progress','waiting_client','pending_closure','resolved','closed','cancelled'].map((s) => ({
              value: s,
              label: t(`status.${s.toUpperCase()}`),
            }))}
          />
          {(priority || status) && (
            <button
              onClick={() => { setPriority(''); setStatus(''); setPage(0) }}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors border border-transparent hover:border-brand-border rounded-lg"
            >
              {t('inbox.clearFilters')}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-500 animate-pulse">{t('common.loading')}</div>
      ) : tickets.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-600">{t('inbox.empty')}</div>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left border-b border-brand-border">
              <th className="px-5 py-3 font-medium text-slate-500">ID</th>
              <th className="px-3 py-3 font-medium text-slate-500">{t('agentProfile.subject')}</th>
              <th className="px-3 py-3 font-medium text-slate-500 hidden md:table-cell">{t('agentProfile.status')}</th>
              <th className="px-3 py-3 font-medium text-slate-500 hidden sm:table-cell">{t('agentProfile.priority')}</th>
              <th className="px-3 py-3 font-medium text-slate-500 hidden lg:table-cell">{t('agentProfile.client')}</th>
              <th className="px-5 py-3 font-medium text-slate-500 hidden lg:table-cell text-right">{t('agentProfile.date')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3">
                  <Link
                    to={`/tickets/${ticket.id}`}
                    className="font-mono text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    {ticket.external_id}
                  </Link>
                </td>
                <td className="px-3 py-3 max-w-[260px]">
                  <Link to={`/tickets/${ticket.id}`} className="text-slate-300 hover:text-slate-100 transition-colors line-clamp-1">
                    {ticket.subject}
                  </Link>
                </td>
                <td className="px-3 py-3 hidden md:table-cell">
                  <StatusBadge status={ticket.status} />
                </td>
                <td className="px-3 py-3 hidden sm:table-cell">
                  {ticket.priority && <PriorityBadge priority={ticket.priority} />}
                </td>
                <td className="px-3 py-3 hidden lg:table-cell text-slate-500">{ticket.source_name}</td>
                <td className="px-5 py-3 hidden lg:table-cell text-right text-slate-600">
                  {new Date(ticket.first_ingested_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-brand-border">
          <span className="text-xs text-slate-500">
            {total} {t('agentProfile.tickets')}
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => i).map((i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${
                  page === i
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

// ── Agent Calendar Widget ─────────────────────────────────────────────────────

function AgentCalendarWidget({ agentId }: { agentId: number }) {
  const { t, i18n } = useTranslation()
  const today = new Date().toISOString().slice(0, 10)

  const { data: events = [], isLoading } = useCalendarEvents({ agent_id: agentId, from_date: today })

  const onCallEvents  = events.filter((e) => e.type === 'on_call').slice(0, 5)
  const trainingEvents = events.filter((e) => e.type === 'training').slice(0, 5)

  if (isLoading) return null
  if (!onCallEvents.length && !trainingEvents.length) return null

  function fmtDate(s: string) {
    return new Date(s + 'T00:00:00').toLocaleDateString(i18n.language, {
      weekday: 'short', day: 'numeric', month: 'short',
    })
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
        {t('agentProfile.upcomingAgenda')}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Plantões */}
        {onCallEvents.length > 0 && (
          <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-300">{t('calendar.type.on_call')}</span>
            </div>
            <ul className="space-y-1.5">
              {onCallEvents.map((ev) => (
                <li key={ev.id} className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                  <span>{fmtDate(ev.event_date)}</span>
                  {ev.start_time && (
                    <span className="text-slate-600">{ev.start_time}{ev.end_time ? `–${ev.end_time}` : ''}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Treinamentos */}
        {trainingEvents.length > 0 && (
          <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-300">{t('calendar.type.training')}</span>
            </div>
            <ul className="space-y-1.5">
              {trainingEvents.map((ev) => (
                <li key={ev.id} className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span>{fmtDate(ev.event_date)}</span>
                  {ev.source && <span className="text-slate-500 truncate">— {ev.source.name}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export function AgentProfilePage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: me } = useMe()
  const { data: allUsers } = useAllUsers()
  const { from, to, granularity, setFrom, setTo } = useDateRange(30)

  const userId = Number(id)

  // Non-admins can only see their own profile
  if (me && me.role !== 'admin' && me.id !== userId) {
    navigate(`/dashboard/agent/${me.id}`, { replace: true })
    return null
  }

  const { data: analytics, isLoading } = useAgentAnalytics(userId, {
    from,
    to,
    granularity: granularity as Granularity,
  })

  const agents = (allUsers ?? []).filter((u) => u.is_active && (u.role === 'admin' || u.role === 'agent'))

  const fmtDate = (d: string) => {
    const dt = new Date(d)
    const loc = i18n.language
    if (granularity === 'day')   return dt.toLocaleDateString(loc, { day: 'numeric', month: 'short' })
    if (granularity === 'week')  return dt.toLocaleDateString(loc, { day: '2-digit', month: '2-digit' })
    return dt.toLocaleDateString(loc, { month: 'short', year: '2-digit' })
  }

  if (isLoading || !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-slate-500 animate-pulse">{t('common.loading')}</p>
      </div>
    )
  }

  const kpis = analytics.kpis

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">

      {/* ── Header ── */}
      <div className="bg-white/[0.03] border border-brand-border rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">

          {/* Agent info */}
          <div className="flex items-center gap-4">
            <Avatar name={analytics.name} avatar={analytics.avatar} size="xl" />
            <div>
              <h2 className="text-xl font-bold text-slate-100">{analytics.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-300 text-[11px] font-medium">
                  {t(`settings.users.role.${analytics.role}`)}
                </span>
                {analytics.is_senior && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[11px] font-medium flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {t('settings.users.senior')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-2">
                {t('agentProfile.memberSince')} {new Date(analytics.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Admin: agent selector */}
          {me?.role === 'admin' && agents.length > 1 && (
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={userId}
                onChange={(e) => navigate(`/dashboard/agent/${e.target.value}`)}
                className="bg-white/5 border border-brand-border rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                {agents.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Date range picker */}
        <div className="mt-5 pt-5 border-t border-brand-border">
          <DateRangePicker
            from={from}
            to={to}
            onChange={(r) => { setFrom(r.from); setTo(r.to) }}
          />
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label={t('agentProfile.kpi.totalPeriod')}
          value={kpis.total_period}
          icon={<Inbox className="w-4 h-4" />}
        />
        <KpiCard
          label={t('agentProfile.kpi.open')}
          value={kpis.currently_open}
          icon={<TrendingUp className="w-4 h-4" />}
          accent="text-orange-400"
        />
        <KpiCard
          label={t('agentProfile.kpi.resolved')}
          value={kpis.resolved_period}
          icon={<ShieldCheck className="w-4 h-4" />}
          accent="text-emerald-400"
        />
        <KpiCard
          label={t('agentProfile.kpi.mttr')}
          value={kpis.mttr_hours !== null ? `${kpis.mttr_hours}h` : '—'}
          icon={<Clock className="w-4 h-4" />}
          accent="text-blue-400"
        />
        <KpiCard
          label={t('agentProfile.kpi.slaRate')}
          value={kpis.sla_rate !== null ? `${kpis.sla_rate}%` : '—'}
          sub={t('agentProfile.kpi.slaTarget')}
          icon={<ShieldCheck className="w-4 h-4" />}
          accent={
            kpis.sla_rate === null ? 'text-slate-500'
            : kpis.sla_rate >= 80 ? 'text-emerald-400'
            : 'text-red-400'
          }
        />
        <KpiCard
          label={t('agentProfile.kpi.csat')}
          value={kpis.avg_csat !== null ? `${kpis.avg_csat}` : '—'}
          sub={kpis.avg_csat !== null ? '/ 5.0' : undefined}
          icon={<Star className="w-4 h-4" />}
          accent="text-amber-400"
        />
      </div>

      {/* ── Volume trend ── */}
      <div className="bg-white/[0.03] border border-brand-border rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
          {t('agentProfile.volumeTrend')}
        </h3>
        {analytics.volume_trend.length === 0 ? (
          <p className="text-xs text-slate-600 py-8 text-center">{t('agentProfile.noData')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={analytics.volume_trend} barCategoryGap="35%">
              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="opened" fill="#7c3aed" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Breakdown charts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* By priority */}
        <div className="bg-white/[0.03] border border-brand-border rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
            {t('agentProfile.byPriority')}
          </h3>
          {analytics.by_priority.length === 0 ? (
            <p className="text-xs text-slate-600 py-8 text-center">{t('agentProfile.noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={[...analytics.by_priority].sort(
                  (a, b) => ['urgent','high','medium','low'].indexOf(a.priority ?? '') - ['urgent','high','medium','low'].indexOf(b.priority ?? '')
                )}
                layout="vertical"
                barCategoryGap="25%"
              >
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  dataKey="priority"
                  type="category"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  tickFormatter={(v) => t(`priority.${v.toUpperCase()}`)}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {analytics.by_priority.map((entry) => (
                    <Cell
                      key={entry.priority}
                      fill={PRIORITY_COLORS[entry.priority ?? 'unknown'] ?? '#94a3b8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By type */}
        <div className="bg-white/[0.03] border border-brand-border rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
            {t('agentProfile.byType')}
          </h3>
          {analytics.by_type.length === 0 ? (
            <p className="text-xs text-slate-600 py-8 text-center">{t('agentProfile.noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={analytics.by_type}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {analytics.by_type.map((entry) => (
                    <Cell
                      key={entry.type}
                      fill={TYPE_COLORS[entry.type ?? 'unknown'] ?? '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={<ChartTooltip />}
                  formatter={(value, name) => [value, name]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-[11px] text-slate-400">
                      {t(`type.${String(value).toUpperCase()}`)}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Agenda ── */}
      <AgentCalendarWidget agentId={userId} />

      {/* ── Ticket history ── */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          {t('agentProfile.ticketHistory')}
        </h3>
        <TicketHistory userId={userId} />
      </div>

    </div>
  )
}
