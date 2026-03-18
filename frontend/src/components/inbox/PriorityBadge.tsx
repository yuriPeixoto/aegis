import type { TicketPriority } from '../../types/ticket'

const CONFIG: Record<TicketPriority, { label: string; className: string; dot: string }> = {
  URGENTE: {
    label: 'Urgente',
    className: 'bg-red-500/20 text-red-300 border-red-500/40',
    dot: 'bg-red-400',
  },
  ALTO: {
    label: 'Alto',
    className: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    dot: 'bg-orange-400',
  },
  MEDIO: {
    label: 'Médio',
    className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    dot: 'bg-yellow-400',
  },
  BAIXO: {
    label: 'Baixo',
    className: 'bg-brand-neon/10 text-green-300 border-brand-neon/20',
    dot: 'bg-brand-neon',
  },
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const { label, className, dot } = CONFIG[priority] ?? {
    label: priority,
    className: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    dot: 'bg-slate-400',
  }
  return (
    <span className={`badge border flex items-center gap-1 ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
