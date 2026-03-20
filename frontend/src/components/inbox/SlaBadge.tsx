import { useTranslation } from 'react-i18next'

const STYLE: Record<string, string> = {
  on_time: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  at_risk: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  overdue: 'border-red-500/40 bg-red-500/10 text-red-400',
  met: 'border-slate-500/30 bg-slate-500/10 text-slate-500',
}

interface SlaBadgeProps {
  status: 'on_time' | 'at_risk' | 'overdue' | 'met' | null
  dueAt: string | null
}

export function SlaBadge({ status, dueAt }: SlaBadgeProps) {
  const { t } = useTranslation()

  if (!status || !dueAt) return null

  return (
    <span
      className={`badge border text-[10px] font-mono ${STYLE[status] ?? ''}`}
      title={new Date(dueAt).toLocaleString()}
    >
      SLA: {t(`sla.${status}`)}
    </span>
  )
}
