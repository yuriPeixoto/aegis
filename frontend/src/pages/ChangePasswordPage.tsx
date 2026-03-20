import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useChangePassword } from '../hooks/useUsers'
import { useQueryClient } from '@tanstack/react-query'

export function ChangePasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { mutate, isPending, error } = useChangePassword()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    mutate(password, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['me'] })
        navigate('/')
      },
    })
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="w-6 h-6 text-brand-neon" strokeWidth={2.5} />
          <span className="text-2xl font-bold tracking-tight">
            <span className="text-slate-100">Ae</span>
            <span className="text-brand-purple">gis</span>
          </span>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-xl p-8">
          <h1 className="text-lg font-semibold text-slate-100 mb-1">
            {t('changePassword.title')}
          </h1>
          <p className="text-sm text-slate-400 mb-6">{t('changePassword.subtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                {t('changePassword.newPassword')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="input"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                {t('changePassword.confirm')}
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                className="input"
                placeholder="••••••••"
              />
            </div>

            {mismatch && (
              <p className="text-xs text-red-400">{t('changePassword.mismatch')}</p>
            )}
            {error && (
              <p className="text-xs text-red-400">{t('changePassword.error')}</p>
            )}

            <button type="submit" disabled={isPending} className="btn-primary w-full mt-2">
              {isPending ? t('changePassword.saving') : t('changePassword.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
