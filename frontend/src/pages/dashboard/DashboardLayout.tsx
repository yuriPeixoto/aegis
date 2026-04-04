import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, MonitorCheck, BarChart2, Users } from 'lucide-react'
import { useMe } from '../../hooks/useAuth'

const TABS = [
  { path: 'overview', label: 'dashboard.nav.overview', icon: LayoutDashboard },
  { path: 'monitor',  label: 'dashboard.nav.monitor',  icon: MonitorCheck     },
  { path: 'reports',  label: 'dashboard.nav.reports',  icon: BarChart2        },
  { path: 'agents',   label: 'dashboard.nav.agents',   icon: Users            },
]

export function DashboardLayout() {
  const { t } = useTranslation()
  const { data: user } = useMe()
  const { pathname } = useLocation()

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-slate-500">{t('settings.forbidden')}</p>
      </div>
    )
  }

  // Index: redirect to overview
  if (pathname === '/dashboard') {
    return <Navigate to="/dashboard/overview" replace />
  }

  // When viewing an agent profile, highlight "agents" tab
  const isAgentProfile = pathname.startsWith('/dashboard/agent/')

  return (
    <div className="flex gap-8 h-full">
      {/* Left nav */}
      <nav className="w-44 shrink-0 pt-1">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3 px-2">
          {t('dashboard.nav.title')}
        </p>
        <ul className="space-y-0.5">
          {TABS.map(({ path, label, icon: Icon }) => (
            <li key={path}>
              <NavLink
                to={`/dashboard/${path}`}
                className={({ isActive }) => {
                  const active = isActive || (isAgentProfile && path === 'agents')
                  return `w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors text-left ${
                    active
                      ? 'bg-white/8 text-slate-100 font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`
                }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {t(label)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Divider */}
      <div className="w-px bg-brand-border shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0 pt-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
