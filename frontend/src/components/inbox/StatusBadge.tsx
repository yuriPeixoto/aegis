import type { TicketStatus } from '../../types/ticket'

const CONFIG: Record<TicketStatus, { label: string; className: string }> = {
  ABERTO: { label: 'Aberto', className: 'bg-brand-purple/20 text-purple-300 border-brand-purple/30' },
  EM_ATENDIMENTO: { label: 'Em Atendimento', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  AGUARDANDO_CLIENTE: { label: 'Ag. Cliente', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  AGUARDANDO_DESENVOLVIMENTO: { label: 'Ag. Dev', className: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  EM_DESENVOLVIMENTO: { label: 'Em Dev', className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  AGUARDANDO_TESTE: { label: 'Ag. Teste', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  EM_TESTE: { label: 'Em Teste', className: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  RESOLVIDO: { label: 'Resolvido', className: 'bg-green-500/20 text-green-300 border-green-500/30' },
  FECHADO: { label: 'Fechado', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  CANCELADO: { label: 'Cancelado', className: 'bg-red-500/10 text-red-400 border-red-500/20 line-through' },
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const { label, className } = CONFIG[status] ?? {
    label: status,
    className: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  }
  return (
    <span className={`badge border ${className}`}>{label}</span>
  )
}
