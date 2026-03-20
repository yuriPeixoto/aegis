import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useMe } from '../../hooks/useAuth'
import { useInboundNotifications } from '../../hooks/useInboundNotifications'

const ROUTE_TITLE_KEYS: Record<string, string> = {
  '/': 'nav.inbox',
  '/dashboard': 'nav.dashboard',
  '/settings': 'nav.settings',
}

export function AppShell() {
  const { t, i18n } = useTranslation()
  const { data: user, isLoading, isError } = useMe()
  const { pathname } = useLocation()

  const isTicketDetail = pathname.startsWith('/tickets/')
  useInboundNotifications()
  const titleKey = ROUTE_TITLE_KEYS[pathname] ?? 'nav.inbox'

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
        <TopBar title={t(titleKey)} />
        <main className={`flex-1 min-h-0 ${isTicketDetail ? 'overflow-hidden' : 'overflow-y-auto p-6'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
