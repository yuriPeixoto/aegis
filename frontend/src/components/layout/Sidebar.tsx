import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Inbox, LayoutDashboard, Settings, Zap } from 'lucide-react'
import { useMe } from '../../hooks/useAuth'
import { useTickets } from '../../hooks/useTickets'

function InboxBadge({ userId }: { userId: number }) {
  const { data } = useTickets({ assigned_to_user_id: userId, active_only: true, limit: 1 })
  const count = data?.total ?? 0
  if (!count) return null
  return (
    <span className="ml-auto text-[10px] font-bold bg-brand-purple/80 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function Sidebar() {
  const { t } = useTranslation()
  const { data: user } = useMe()

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-brand-dark border-r border-brand-border h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-brand-border">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-brand-neon" strokeWidth={2.5} />
          <span className="text-lg font-bold tracking-tight">
            <span className="text-slate-100">Ae</span>
            <span className="text-brand-purple">gis</span>
          </span>
        </div>
        <p className="text-[10px] text-slate-500 mt-0.5 font-mono uppercase tracking-widest">
          {t('login.subtitle')}
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <NavLink to="/" end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
          <Inbox className="w-4 h-4 shrink-0" />
          {t('nav.inbox')}
          {user && <InboxBadge userId={user.id} />}
        </NavLink>

        {user?.role === 'admin' && (
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {t('nav.dashboard')}
          </NavLink>
        )}

        <NavLink to="/settings" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
          <Settings className="w-4 h-4 shrink-0" />
          {t('nav.settings')}
        </NavLink>
      </nav>

      <div className="px-4 py-3 border-t border-brand-border">
        <p className="text-[10px] text-slate-600 font-mono">v0.1.0</p>
      </div>
    </aside>
  )
}
