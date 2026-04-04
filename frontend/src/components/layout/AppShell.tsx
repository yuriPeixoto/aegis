import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useMe } from '../../hooks/useAuth'
import { useInboundNotifications } from '../../hooks/useInboundNotifications'
import type { TFunction } from 'i18next'

const SINGLE_TITLES: Record<string, string> = {
  '/':           'nav.inbox',
  '/profile':    'profile.title',
  '/shortcuts':  'nav.shortcuts',
}

const DASHBOARD_SEGMENTS: Record<string, string> = {
  overview: 'dashboard.nav.overview',
  monitor:  'dashboard.nav.monitor',
  reports:  'dashboard.nav.reports',
  agents:   'dashboard.nav.agents',
  agent:    'agentProfile.title',
}

const SETTINGS_SEGMENTS: Record<string, string> = {
  users:         'settings.nav.users',
  sources:       'settings.nav.sources',
  tags:          'settings.nav.tags',
  sla:           'settings.nav.sla',
  autoclose:     'settings.nav.autoClose',
  canned:        'settings.nav.cannedResponses',
  escalation:    'settings.nav.escalation',
  notifications: 'settings.nav.notifications',
}

function getBreadcrumbs(pathname: string, t: TFunction): string[] {
  if (pathname.startsWith('/dashboard')) {
    const seg = pathname.split('/')[2]
    if (seg && DASHBOARD_SEGMENTS[seg]) {
      return [t('nav.dashboard'), t(DASHBOARD_SEGMENTS[seg])]
    }
    return [t('nav.dashboard')]
  }

  if (pathname.startsWith('/settings')) {
    const seg = pathname.split('/')[2]
    if (seg && SETTINGS_SEGMENTS[seg]) {
      return [t('nav.settings'), t(SETTINGS_SEGMENTS[seg])]
    }
    return [t('nav.settings')]
  }

  if (pathname.startsWith('/tickets/')) {
    return [t('nav.inbox')]
  }

  return [t(SINGLE_TITLES[pathname] ?? 'nav.inbox')]
}

export function AppShell() {
  const { t, i18n } = useTranslation()
  const { data: user, isLoading, isError } = useMe()
  const { pathname } = useLocation()

  useInboundNotifications()

  const breadcrumbs = getBreadcrumbs(pathname, t)

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-brand-dark">
        <span className="text-sm text-slate-500 font-mono animate-pulse">
          {i18n.isInitialized ? t('inbox.loading') : 'Loading...'}
        </span>
      </div>
    )
  }

  if (isError || !user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar breadcrumbs={breadcrumbs} />
        <main className={`flex-1 min-h-0 ${pathname.startsWith('/tickets/') ? 'overflow-hidden' : 'overflow-y-auto p-6'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
