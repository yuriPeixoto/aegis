import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ComposedChart, PieChart, Pie, Cell,
  Legend, CartesianGrid,
} from 'recharts'
import { Inbox, CheckCircle2, Clock, ShieldCheck } from 'lucide-react'

import { useOverviewAnalytics, type OverviewSourceRow } from '../../hooks/useAnalytics'
import { useDateRange } from '../../hooks/useDateRange'
import { DateRangePicker } from '../../components/common/DateRangePicker'
import { Avatar } from '../../components/common/Avatar'

// ── Colour palettes ──────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  urgent:  '#f87171',
  high:    '#fb923c',
  medium:  '#facc15',
  low:     '#34d399',
  unknown: '#94a3b8',
}

const TYPE_COLORS: Record<string, string> = {
  bug:         '#f87171',
  improvement: '#60a5fa',
  question:    '#a78bfa',
  support:     '#34d399',
  unknown:     '#94a3b8',
}

// ── Shared helpers ───────────────────────────────────────────────────────────

const PRIORITY_KEYS = ['urgent', 'high', 'medium', 'low']
const TYPE_KEYS     = ['bug', 'improvement', 'question', 'support']

function ChartTooltip({ active, payload, label }: any) {
  const { t, i18n } = useTranslation()
  if (!active || !payload?.length) return null

  const translateLabel = (v: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v))
      return new Date(v).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit', year: 'numeric' })
    if (PRIORITY_KEYS.includes(v)) return t(`priority.${v.toUpperCase()}`)
    if (TYPE_KEYS.includes(v))     return t(`type.${v.toUpperCase()}`)
    return v
  }

  return (
    <div className="bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-xs shadow-lg">
      {label && <p className="text-slate-400 mb-1">{translateLabel(String(label))}</p>}
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill || p.stroke || '#a78bfa' }}>
          {p.name}: {p.value ?? '—'}
        </p>
      ))}
    </div>
  )
}

function fmtDate(isoDate: string, lang: string, granularity: string): string {
  const dt = new Date(isoDate)
  if (granularity === 'month')
    return dt.toLocaleDateString(lang, { month: 'short', year: '2-digit', timeZone: 'UTC' })
  if (granularity === 'week')
    return dt.toLocaleDateString(lang, { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
  return dt.toLocaleDateString(lang, { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
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
        <span className={accent}>{icon}</span>
      </div>
      <span className="text-2xl font-bold text-slate-100">{value}</span>
      {sub && <span className="text-[11px] text-slate-500">{sub}</span>}
    </div>
  )
}

// ── Chart card wrapper ────────────────────────────────────────────────────────

function ChartCard({ title, children, empty }: { title: string; children: React.ReactNode; empty?: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="bg-white/[0.03] border border-brand-border rounded-2xl p-5">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">{title}</h3>
      {empty ? (
        <p className="text-xs text-slate-600 text-center py-8">{t('dashboard.reports.noData')}</p>
      ) : children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ReportsTab() {
  const { t, i18n } = useTranslation()
  const { from, to, granularity, setFrom, setTo } = useDateRange()
  const { data, isLoading } = useOverviewAnalytics({ from, to, granularity })

  // Computed totals from trends
  const totalOpened  = data?.volume_trend.reduce((s, r) => s + r.opened, 0) ?? 0
  const totalResolved = data?.resolution_trend.reduce((s, r) => s + r.resolved, 0) ?? 0
  const avgMttr = (() => {
    if (!data?.resolution_trend.length) return null
    const pts = data.resolution_trend.filter(r => r.avg_mttr_hours !== null)
    if (!pts.length) return null
    return (pts.reduce((s, r) => s + (r.avg_mttr_hours ?? 0), 0) / pts.length).toFixed(1)
  })()

  const volumeData = (data?.volume_trend ?? []).map(r => ({
    ...r,
    label: fmtDate(r.date, i18n.language, granularity),
  }))

  const resolutionData = (data?.resolution_trend ?? []).map(r => ({
    ...r,
    label: fmtDate(r.date, i18n.language, granularity),
  }))

  const byPriorityData = (data?.by_priority ?? []).map(r => ({
    name: r.priority ?? 'unknown',
    value: r.count,
    label: t(`priority.${(r.priority ?? 'unknown').toUpperCase()}`),
    color: PRIORITY_COLORS[r.priority ?? 'unknown'] ?? '#94a3b8',
  }))

  const byTypeData = (data?.by_type ?? []).map(r => ({
    name: r.type ?? 'unknown',
    value: r.count,
    label: t(`type.${(r.type ?? 'unknown').toUpperCase()}`),
    color: TYPE_COLORS[r.type ?? 'unknown'] ?? '#94a3b8',
  }))

  return (
    <div className="space-y-6">
      {/* Date range picker */}
      <div className="bg-white/[0.03] border border-brand-border rounded-2xl px-5 py-4">
        <DateRangePicker
          from={from}
          to={to}
          onChange={(r) => { setFrom(r.from); setTo(r.to) }}
        />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label={t('dashboard.reports.kpi.opened')}
          value={isLoading ? '…' : totalOpened}
          icon={<Inbox className="w-4 h-4" />}
        />
        <KpiCard
          label={t('dashboard.reports.kpi.resolved')}
          value={isLoading ? '…' : totalResolved}
          icon={<CheckCircle2 className="w-4 h-4" />}
          accent="text-emerald-400"
        />
        <KpiCard
          label={t('dashboard.reports.kpi.mttr')}
          value={isLoading ? '…' : avgMttr !== null ? `${avgMttr}h` : '—'}
          icon={<Clock className="w-4 h-4" />}
          accent="text-blue-400"
        />
        <KpiCard
          label={t('dashboard.reports.kpi.slaRate')}
          value={isLoading ? '…' : data?.sla_rate !== null && data?.sla_rate !== undefined ? `${data.sla_rate}%` : '—'}
          sub={t('dashboard.kpi.slaTarget')}
          icon={<ShieldCheck className="w-4 h-4" />}
          accent={
            !data?.sla_rate ? 'text-slate-500'
            : data.sla_rate >= 80 ? 'text-emerald-400'
            : 'text-red-400'
          }
        />
      </div>

      {/* Volume trend */}
      <ChartCard title={t('dashboard.reports.volumeTrend')} empty={!isLoading && volumeData.length === 0}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={volumeData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="opened" name={t('dashboard.reports.opened')} fill="#7c3aed" radius={[3, 3, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Resolution trend (resolved bars + MTTR line) */}
      <ChartCard title={t('dashboard.reports.resolutionTrend')} empty={!isLoading && resolutionData.length === 0}>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={resolutionData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={40} unit="h" />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar yAxisId="left" dataKey="resolved" name={t('dashboard.reports.resolved')} fill="#34d399" radius={[3, 3, 0, 0]} maxBarSize={36} />
            <Line yAxisId="right" dataKey="avg_mttr_hours" name={t('dashboard.reports.mttrLabel')} stroke="#60a5fa" strokeWidth={2} dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Breakdown: by priority + by type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={t('dashboard.reports.byPriority')} empty={!isLoading && byPriorityData.length === 0}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={byPriorityData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={2}
              >
                {byPriorityData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0]
                  return (
                    <div className="bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-xs shadow-lg">
                      <p style={{ color: p.payload.color }}>{p.payload.label}: {p.value}</p>
                    </div>
                  )
                }}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-slate-400">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('dashboard.reports.byType')} empty={!isLoading && byTypeData.length === 0}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={byTypeData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={2}
              >
                {byTypeData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0]
                  return (
                    <div className="bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-xs shadow-lg">
                      <p style={{ color: p.payload.color }}>{p.payload.label}: {p.value}</p>
                    </div>
                  )
                }}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-slate-400">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* By agent table */}
      <ChartCard title={t('dashboard.reports.byAgent')} empty={!isLoading && (data?.by_agent ?? []).length === 0}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-brand-border">
                <th className="text-left pb-2 font-medium">{t('dashboard.reports.colAgent')}</th>
                <th className="text-right pb-2 font-medium">{t('dashboard.reports.colTotal')}</th>
                <th className="text-right pb-2 font-medium">{t('dashboard.reports.colResolved')}</th>
                <th className="text-right pb-2 font-medium">{t('dashboard.reports.colRate')}</th>
                <th className="text-right pb-2 font-medium">{t('dashboard.reports.colMttr')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/50">
              {(data?.by_agent ?? []).map((agent) => {
                const rate = agent.total > 0
                  ? Math.round((agent.resolved / agent.total) * 100)
                  : null
                return (
                  <tr key={agent.user_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5">
                      <Link
                        to={`/dashboard/agent/${agent.user_id}`}
                        className="flex items-center gap-2 hover:text-violet-300 transition-colors"
                      >
                        <Avatar name={agent.name} avatar={agent.avatar} size="xs" />
                        <span className="text-slate-300 font-medium">{agent.name}</span>
                      </Link>
                    </td>
                    <td className="py-2.5 text-right text-slate-300">{agent.total}</td>
                    <td className="py-2.5 text-right text-emerald-400">{agent.resolved}</td>
                    <td className="py-2.5 text-right">
                      {rate !== null ? (
                        <span className={rate >= 80 ? 'text-emerald-400' : rate >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                          {rate}%
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-blue-400">
                      {agent.mttr_hours !== null ? `${agent.mttr_hours}h` : <span className="text-slate-600">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* By source table */}
      <ChartCard title={t('dashboard.reports.bySource')} empty={!isLoading && (data?.by_source ?? []).length === 0}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-brand-border">
                <th className="text-left pb-2 font-medium">{t('dashboard.reports.colSource')}</th>
                <th className="text-right pb-2 font-medium">{t('dashboard.reports.colTotal')}</th>
                <th className="text-right pb-2 font-medium">{t('dashboard.reports.colResolved')}</th>
                <th className="text-right pb-2 font-medium">{t('dashboard.reports.colRate')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/50">
              {(data?.by_source ?? []).map((src: OverviewSourceRow) => {
                const rate = src.total > 0
                  ? Math.round((src.resolved / src.total) * 100)
                  : null
                return (
                  <tr key={src.source_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 text-slate-300 font-medium">{src.name}</td>
                    <td className="py-2.5 text-right text-slate-300">{src.total}</td>
                    <td className="py-2.5 text-right text-emerald-400">{src.resolved}</td>
                    <td className="py-2.5 text-right">
                      {rate !== null ? (
                        <span className={rate >= 80 ? 'text-emerald-400' : rate >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                          {rate}%
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}
