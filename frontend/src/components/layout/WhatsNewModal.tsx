import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, X } from 'lucide-react'
import { useMe, useMarkChangelogSeen } from '../../hooks/useAuth'
import { useAbout } from '../../hooks/useAbout'

function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

export function WhatsNewModal() {
  const { t } = useTranslation()
  const { data: me } = useMe()
  const { data: about } = useAbout()
  const { mutate: markSeen } = useMarkChangelogSeen()
  const [dismissed, setDismissed] = useState(false)

  const pendingEntries = useMemo(() => {
    if (!me?.last_seen_version || !about) return []
    return about.changelog.filter((entry) => compareVersions(entry.version, me.last_seen_version!) > 0)
  }, [me, about])

  const isOpen = pendingEntries.length > 0 && !dismissed

  const handleClose = () => {
    setDismissed(true)
    if (about) markSeen(about.version)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/80 backdrop-blur-sm">
      <div className="bg-brand-dark border border-brand-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-neon" />
            {t('whatsNew.title')}
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-brand-border/50">
          {pendingEntries.map((entry) => (
            <div key={entry.version} className="px-6 py-4 space-y-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-brand-neon">v{entry.version}</span>
                <span className="text-xs text-slate-500">{entry.date}</span>
              </div>
              <ul className="space-y-1">
                {entry.highlights.map((item, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-brand-purple mt-0.5 shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-brand-border flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-brand-purple hover:bg-brand-purple/90 text-white text-sm font-semibold rounded-lg shadow-lg shadow-brand-purple/20 transition-all"
          >
            {t('whatsNew.dismiss')}
          </button>
        </div>
      </div>
    </div>
  )
}
