import { useTranslation } from 'react-i18next'
import type { TicketType } from '../../types/ticket'

const STYLE: Record<TicketType, string> = {
  BUG: 'bg-red-500/10 text-red-400 border-red-500/20',
  MELHORIA: 'bg-brand-purple/10 text-purple-300 border-brand-purple/20',
  DUVIDA: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  SUPORTE: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

export function TypeBadge({ type }: { type: TicketType }) {
  const { t } = useTranslation()
  return (
    <span className={`badge border ${STYLE[type] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
      {t(`type.${type}`, { defaultValue: type })}
    </span>
  )
}
