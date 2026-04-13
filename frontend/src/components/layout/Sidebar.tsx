import { useState } from 'react'
import { useNavigate, NavLink, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Inbox, LayoutDashboard, Settings, Zap, MessageSquarePlus, Keyboard, Trash2, CalendarDays } from 'lucide-react'
import { useMe } from '../../hooks/useAuth'
import { useTickets } from '../../hooks/useTickets'
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut'
import { useSavedViews, useDeleteSavedView } from '../../hooks/useSavedViews'
import { InternalTicketModal } from './InternalTicketModal'

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
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data: user } = useMe()
  const { data: views = [] } = useSavedViews()
  const deleteView = useDeleteSavedView()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hoveredViewId, setHoveredViewId] = useState<number | null>(null)

  const activeViewId = searchParams.get('view') ? Number(searchParams.get('view')) : null

  useKeyboardShortcut('i', () => navigate('/'))
  useKeyboardShortcut('d', () => navigate('/dashboard'), { enabled: user?.role === 'admin' })
  useKeyboardShortcut('a', () => navigate('/agenda'))
  useKeyboardShortcut('s', () => navigate('/settings'))
  useKeyboardShortcut('c', () => setIsModalOpen(true), { enabled: !isModalOpen })
  useKeyboardShortcut('ctrl+k', () => setIsModalOpen(true), { enabled: !isModalOpen })

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

      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        <NavLink to="/" end className={({ isActive }) => `sidebar-link${isActive && !activeViewId ? ' active' : ''}`}>
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

        <NavLink to="/agenda" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
          <CalendarDays className="w-4 h-4 shrink-0" />
          {t('nav.calendar')}
        </NavLink>

        <NavLink to="/settings" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
          <Settings className="w-4 h-4 shrink-0" />
          {t('nav.settings')}
        </NavLink>

        <NavLink to="/shortcuts" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
          <Keyboard className="w-4 h-4 shrink-0" />
          {t('nav.shortcuts')}
        </NavLink>

        {/* Views section */}
        {views.length > 0 && (
          <div className="pt-4 mt-2">
            <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold px-3 mb-1.5">
              {t('inbox.views.section')}
            </p>
            <div className="space-y-0.5">
              {views.map((view) => {
                const isActive = activeViewId === view.id
                const canDelete = user && (view.user_id === user.id || user.role === 'admin')
                return (
                  <div
                    key={view.id}
                    className="relative group"
                    onMouseEnter={() => setHoveredViewId(view.id)}
                    onMouseLeave={() => setHoveredViewId(null)}
                  >
                    <button
                      onClick={() => navigate(`/?view=${view.id}`)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left pr-8 ${
                        isActive
                          ? 'bg-brand-purple/20 text-brand-purple font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <span className="text-base leading-none shrink-0">{view.icon}</span>
                      <span className="truncate">{view.name}</span>
                    </button>
                    {canDelete && hoveredViewId === view.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteView.mutate(view.id) }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-red-400 transition-colors p-0.5"
                        title={t('inbox.views.deleteTitle')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="pt-4 mt-4 border-t border-brand-border/50">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-lg transition-colors group"
          >
            <MessageSquarePlus className="w-4 h-4 text-brand-purple group-hover:text-brand-neon transition-colors" />
            <span className="flex-1 text-left">{t('nav.reportIssue')}</span>
            <kbd className="hidden group-hover:block px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-800 text-slate-500 rounded border border-slate-700 shadow-sm">
              C
            </kbd>
          </button>
        </div>
      </nav>

      <div className="px-4 py-3 border-t border-brand-border">
        <p className="text-[10px] text-slate-600 font-mono">v0.1.0</p>
      </div>

      <InternalTicketModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </aside>
  )
}
