import React from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, Command } from 'lucide-react'

export function ShortcutsPage() {
  const { t } = useTranslation()

  const sections = [
    {
      title: t('nav.shortcutsGeneral'),
      shortcuts: [
        { keys: ['I'], description: t('nav.shortcutInbox') },
        { keys: ['D'], description: t('nav.shortcutDashboard') },
        { keys: ['S'], description: t('nav.shortcutSettings') },
        { keys: ['C'], description: t('nav.shortcutReport') },
        { keys: ['Ctrl', 'K'], description: t('nav.shortcutReport') },
        { keys: ['Esc'], description: t('nav.shortcutClose') },
      ],
    },
    {
      title: t('nav.shortcutsInbox'),
      shortcuts: [
        { keys: ['J'], description: t('nav.shortcutNext') },
        { keys: ['K'], description: t('nav.shortcutPrev') },
        { keys: ['Enter'], description: t('nav.shortcutOpen') },
        { keys: ['R'], description: t('nav.shortcutRefresh') },
        { keys: ['Esc'], description: t('nav.shortcutClose') },
      ],
    },
    {
      title: t('inbox.bulk.selected', { count: '' }).trim(),
      shortcuts: [
        { keys: ['A'], description: t('nav.shortcutAssign') },
        { keys: ['S'], description: t('nav.shortcutBulkStatus') },
        { keys: ['P'], description: t('nav.shortcutBulkPriority') },
      ],
    },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
          <Keyboard className="w-8 h-8 text-brand-purple" />
          {t('nav.shortcutsTitle')}
        </h1>
        <p className="text-slate-400 mt-2">
          {t('nav.shortcutsSubtitle', 'Use keyboard shortcuts to navigate and take actions faster.')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {sections.map((section) => (
          <div key={section.title} className="bg-brand-dark/50 border border-brand-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-brand-border bg-brand-dark">
              <h2 className="font-semibold text-slate-200 uppercase tracking-wider text-xs">
                {section.title}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {section.shortcuts.map((shortcut, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">{shortcut.description}</span>
                  <div className="flex items-center gap-1.5">
                    {shortcut.keys.map((key, kIdx) => (
                      <React.Fragment key={kIdx}>
                        <kbd className="min-w-[24px] h-6 px-1.5 flex items-center justify-center text-[11px] font-mono font-bold bg-slate-800 text-slate-200 rounded border border-slate-700 shadow-sm">
                          {key === 'Ctrl' ? <Command className="w-3 h-3" /> : key}
                        </kbd>
                        {kIdx < shortcut.keys.length - 1 && <span className="text-slate-600 text-xs">+</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
