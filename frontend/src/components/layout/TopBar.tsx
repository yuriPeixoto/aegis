import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LogOut, UserCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMe, useLogout } from '../../hooks/useAuth'
import { LanguageSwitcher } from './LanguageSwitcher'
import { NotificationBell } from './NotificationBell'
import { Avatar } from '../common/Avatar'

interface TopBarProps {
  title: string
}

export function TopBar({ title }: TopBarProps) {
  const { t } = useTranslation()
  const { data: user } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-brand-border bg-brand-dark/80 backdrop-blur-sm sticky top-0 z-10">
      <h1 className="text-sm font-semibold text-slate-200 tracking-wide">{title}</h1>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <NotificationBell />

        {/* Avatar dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/5 transition-colors"
            title={user?.name}
          >
            {user ? (
              <Avatar name={user.name} avatar={user.avatar} size="sm" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-white/10" />
            )}
            <span className="text-xs font-mono text-slate-400 hidden sm:block">
              {user?.name ?? '...'}
            </span>
          </button>

          {open && (
            <div className="absolute right-0 mt-1 w-48 rounded-xl border border-brand-border bg-brand-dark shadow-lg py-1 z-50">
              <button
                onClick={() => { setOpen(false); navigate('/profile') }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                <UserCircle className="w-4 h-4 text-slate-500" />
                {t('topbar.myProfile')}
              </button>
              <div className="border-t border-brand-border my-1" />
              <button
                onClick={() => { setOpen(false); logout() }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                <LogOut className="w-4 h-4 text-slate-500" />
                {t('topbar.signOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
