import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useMe } from '../../hooks/useAuth'

interface AppShellProps {
  title: string
}

export function AppShell({ title }: AppShellProps) {
  const { data: user, isLoading, isError } = useMe()

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-brand-dark">
        <span className="text-sm text-slate-500 font-mono animate-pulse">Connecting...</span>
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
        <TopBar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
