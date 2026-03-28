import { useTranslation } from 'react-i18next'
import { LogOut, User } from 'lucide-react'
import { useMe, useLogout } from '../../hooks/useAuth'
import { LanguageSwitcher } from './LanguageSwitcher'
import { NotificationBell } from './NotificationBell'

interface TopBarProps {
  title: string
}

export function TopBar({ title }: TopBarProps) {
  const { t } = useTranslation()
  const { data: user } = useMe()
  const logout = useLogout()

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-brand-border bg-brand-dark/80 backdrop-blur-sm sticky top-0 z-10">
      <h1 className="text-sm font-semibold text-slate-200 tracking-wide">{title}</h1>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <NotificationBell />
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <User className="w-3.5 h-3.5" />
          <span className="font-mono">{user?.name ?? '...'}</span>
        </div>
        <button
          onClick={logout}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors"
          title={t('topbar.signOut')}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
