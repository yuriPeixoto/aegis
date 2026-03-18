import { FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Zap } from 'lucide-react'
import { useLogin } from '../hooks/useAuth'
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher'

export function LoginPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { mutate: login, isPending, isError } = useLogin()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    login({ email, password })
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#7C3AED 1px, transparent 1px), linear-gradient(90deg, #7C3AED 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="glass-card p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-brand-purple/20 border border-brand-purple/30 flex items-center justify-center mb-3">
              <Zap className="w-6 h-6 text-brand-neon" strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold">
              <span className="text-slate-100">Ae</span>
              <span className="text-brand-purple">gis</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-mono uppercase tracking-widest">
              {t('login.subtitle')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
                {t('login.emailLabel')}
              </label>
              <input
                type="email"
                className="input"
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
                {t('login.passwordLabel')}
              </label>
              <input
                type="password"
                className="input"
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {isError && (
              <p className="text-xs text-red-400 font-mono bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                {t('login.error')}
              </p>
            )}

            <button type="submit" className="btn-primary w-full mt-2" disabled={isPending}>
              {isPending ? t('login.submitting') : t('login.submit')}
            </button>
          </form>
        </div>

        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-[11px] text-slate-600 font-mono">{t('login.restricted')}</p>
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  )
}
