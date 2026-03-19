import { useLanguage } from '../../contexts/LanguageContext'
import { tStatus } from '../../lib/translations'

const STYLE: Record<string, string> = {
  OPEN:           'bg-brand-purple/20 text-purple-300 border-brand-purple/30',
  IN_PROGRESS:    'bg-blue-500/20 text-blue-300 border-blue-500/30',
  WAITING_CLIENT: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  WAITING_DEV:    'bg-orange-500/20 text-orange-300 border-orange-500/30',
  IN_DEV:         'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  WAITING_TEST:   'bg-amber-500/20 text-amber-300 border-amber-500/30',
  IN_TEST:        'bg-teal-500/20 text-teal-300 border-teal-500/30',
  RESOLVED:       'bg-green-500/20 text-green-300 border-green-500/30',
  CLOSED:         'bg-slate-500/20 text-slate-400 border-slate-500/30',
  CANCELLED:      'bg-red-500/10 text-red-400 border-red-500/20',
}

export function StatusBadge({ status }: { status: string }) {
  const lang = useLanguage()
  const key = status.toUpperCase()
  return (
    <span className={`badge border ${STYLE[key] ?? 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
      {tStatus(lang, status)}
    </span>
  )
}
