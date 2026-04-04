import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAllUsers } from '../../hooks/useUsers'

export function AgentsTab() {
  const { t } = useTranslation()
  const { data: allUsers, isLoading } = useAllUsers()

  const agents = (allUsers ?? []).filter(
    (u) => u.is_active && (u.role === 'admin' || u.role === 'agent'),
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-sm text-slate-500 animate-pulse">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-w-xl">
      <p className="text-xs text-slate-500 mb-4">{t('dashboard.agents.subtitle')}</p>
      {agents.map((agent) => (
        <Link
          key={agent.id}
          to={`/dashboard/agent/${agent.id}`}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-brand-border hover:bg-white/[0.06] hover:border-violet-500/30 transition-all group"
        >
          <div className="w-9 h-9 rounded-full bg-violet-600/20 text-violet-300 flex items-center justify-center text-xs font-bold shrink-0">
            {agent.name
              .split(' ')
              .slice(0, 2)
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 group-hover:text-violet-300 transition-colors truncate">
              {agent.name}
            </p>
            <p className="text-xs text-slate-500 capitalize">
              {t(`settings.users.role.${agent.role}`)}
            </p>
          </div>
          <span className="text-xs text-slate-600 group-hover:text-violet-400 transition-colors">
            {t('dashboard.agents.viewProfile')} →
          </span>
        </Link>
      ))}
    </div>
  )
}
