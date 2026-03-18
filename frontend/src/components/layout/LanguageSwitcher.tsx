import { useTranslation } from 'react-i18next'

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'pt-BR', label: 'PT' },
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language

  return (
    <div className="flex items-center gap-0.5 bg-white/5 border border-brand-border rounded-lg p-0.5">
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => i18n.changeLanguage(code)}
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all ${
            current === code || (code === 'pt-BR' && current.startsWith('pt'))
              ? 'bg-brand-purple text-white'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
