import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays } from 'lucide-react'
import { daysAgo, today, diffDays, autoGranularity } from '../../hooks/useDateRange'
import type { Granularity } from '../../hooks/useAnalytics'

interface DateRange {
  from: string
  to: string
  granularity: Granularity
}

interface Props {
  from: string
  to: string
  onChange: (range: DateRange) => void
}

const PRESETS = [
  { labelKey: 'dateRange.today', days: 0 },
  { labelKey: 'dateRange.7d', days: 7 },
  { labelKey: 'dateRange.30d', days: 30 },
  { labelKey: 'dateRange.90d', days: 90 },
] as const

function matchPreset(from: string, to: string): number | null {
  const t = today()
  if (to !== t) return null
  const diff = diffDays(from, to)
  for (const p of PRESETS) {
    if (diff === p.days) return p.days
  }
  return null
}

export function DateRangePicker({ from, to, onChange }: Props) {
  const { t } = useTranslation()
  const [custom, setCustom] = useState(() => matchPreset(from, to) === null)
  const activePreset = custom ? null : matchPreset(from, to)

  function applyPreset(days: number) {
    setCustom(false)
    const f = days === 0 ? today() : daysAgo(days)
    const t2 = today()
    onChange({ from: f, to: t2, granularity: autoGranularity(f, t2) })
  }

  function applyCustom(newFrom: string, newTo: string) {
    if (!newFrom || !newTo || newFrom > newTo) return
    onChange({ from: newFrom, to: newTo, granularity: autoGranularity(newFrom, newTo) })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CalendarDays className="w-3.5 h-3.5 text-slate-500 shrink-0" />

      {/* Preset pills */}
      {PRESETS.map((p) => (
        <button
          key={p.days}
          onClick={() => applyPreset(p.days)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            !custom && activePreset === p.days
              ? 'bg-violet-600 text-white'
              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
          }`}
        >
          {t(p.labelKey)}
        </button>
      ))}

      {/* Custom pill */}
      <button
        onClick={() => setCustom(true)}
        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
          custom
            ? 'bg-violet-600 text-white'
            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
        }`}
      >
        {t('dateRange.custom')}
      </button>

      {/* Custom date inputs */}
      {custom && (
        <div className="flex items-center gap-1.5 ml-1">
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => applyCustom(e.target.value, to)}
            className="bg-white/5 border border-brand-border rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <span className="text-xs text-slate-600">→</span>
          <input
            type="date"
            value={to}
            min={from}
            max={today()}
            onChange={(e) => applyCustom(from, e.target.value)}
            className="bg-white/5 border border-brand-border rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
      )}
    </div>
  )
}
