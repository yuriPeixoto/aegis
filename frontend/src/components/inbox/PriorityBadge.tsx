import { useLanguage } from '../../contexts/LanguageContext'
import { tPriority } from '../../lib/translations'

const STYLE: Record<string, { className: string; dot: string }> = {
  URGENT: { className: 'bg-red-500/20 text-red-300 border-red-500/40',       dot: 'bg-red-400' },
  HIGH:   { className: 'bg-orange-500/20 text-orange-300 border-orange-500/40', dot: 'bg-orange-400' },
  MEDIUM: { className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', dot: 'bg-yellow-400' },
  LOW:    { className: 'bg-brand-neon/10 text-green-300 border-brand-neon/20',  dot: 'bg-brand-neon' },
}

export function PriorityBadge({ priority }: { priority: string }) {
  const lang = useLanguage()
  const key = priority.toUpperCase()
  const { className, dot } = STYLE[key] ?? {
    className: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    dot: 'bg-slate-400',
  }
  return (
    <span className={`badge border flex items-center gap-1 ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {tPriority(lang, priority)}
    </span>
  )
}
