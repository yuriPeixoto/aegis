import { useTranslation } from 'react-i18next'
import type { TicketStatus } from '../../types/ticket'

const STYLE: Record<TicketStatus, string> = {
  ABERTO: 'bg-brand-purple/20 text-purple-300 border-brand-purple/30',
  EM_ATENDIMENTO: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  AGUARDANDO_CLIENTE: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  AGUARDANDO_DESENVOLVIMENTO: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  EM_DESENVOLVIMENTO: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  AGUARDANDO_TESTE: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  EM_TESTE: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  RESOLVIDO: 'bg-green-500/20 text-green-300 border-green-500/30',
  FECHADO: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  CANCELADO: 'bg-red-500/10 text-red-400 border-red-500/20 line-through',
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const { t } = useTranslation()
  return (
    <span className={`badge border ${STYLE[status] ?? 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
      {t(`status.${status}`, { defaultValue: status })}
    </span>
  )
}
