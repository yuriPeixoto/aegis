import type { TicketType } from '../../types/ticket'

const CONFIG: Record<TicketType, { label: string; className: string }> = {
  BUG: { label: 'Bug', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  MELHORIA: { label: 'Melhoria', className: 'bg-brand-purple/10 text-purple-300 border-brand-purple/20' },
  DUVIDA: { label: 'Dúvida', className: 'bg-sky-500/10 text-sky-300 border-sky-500/20' },
  SUPORTE: { label: 'Suporte', className: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
}

export function TypeBadge({ type }: { type: TicketType }) {
  const { label, className } = CONFIG[type] ?? {
    label: type,
    className: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  }
  return <span className={`badge border ${className}`}>{label}</span>
}
