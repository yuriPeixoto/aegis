import { useLanguage } from '../../contexts/LanguageContext'
import { tType } from '../../lib/translations'

const STYLE: Record<string, string> = {
  BUG:         'bg-red-500/10 text-red-400 border-red-500/20',
  IMPROVEMENT: 'bg-brand-purple/10 text-purple-300 border-brand-purple/20',
  QUESTION:    'bg-sky-500/10 text-sky-300 border-sky-500/20',
  SUPPORT:     'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

export function TypeBadge({ type }: { type: string }) {
  const lang = useLanguage()
  const key = type.toUpperCase()
  return (
    <span className={`badge border ${STYLE[key] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
      {tType(lang, type)}
    </span>
  )
}
