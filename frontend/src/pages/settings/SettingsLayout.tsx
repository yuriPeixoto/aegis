import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Users, Plug, Clock, Trash2, MessageSquare, Tag as TagIcon, AlertTriangle, Bell } from 'lucide-react'
import { useMe } from '../../hooks/useAuth'

const TABS = [
  { path: 'users',         label: 'settings.nav.users',           icon: Users         },
  { path: 'sources',       label: 'settings.nav.sources',         icon: Plug          },
  { path: 'tags',          label: 'settings.nav.tags',            icon: TagIcon       },
  { path: 'sla',           label: 'settings.nav.sla',             icon: Clock         },
  { path: 'autoclose',     label: 'settings.nav.autoClose',       icon: Trash2        },
  { path: 'canned',        label: 'settings.nav.cannedResponses', icon: MessageSquare },
  { path: 'escalation',    label: 'settings.nav.escalation',      icon: AlertTriangle },
  { path: 'notifications', label: 'settings.nav.notifications',   icon: Bell          },
]

export function SettingsLayout() {
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

  if (pathname === '/settings') {
    return <Navigate to="/settings/users" replace />
  }

  return (
    <div className="flex gap-8 h-full">
      {/* Left nav */}
      <nav className="w-44 shrink-0 pt-1">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3 px-2">
          {t('settings.nav.title')}
        </p>
        <ul className="space-y-0.5">
          {TABS.map(({ path, label, icon: Icon }) => (
            <li key={path}>
              <NavLink
                to={`/settings/${path}`}
                className={({ isActive }) =>
                  `w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors text-left ${
                    isActive
                      ? 'bg-white/8 text-slate-100 font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`
                }
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
