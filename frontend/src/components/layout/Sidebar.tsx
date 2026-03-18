import { NavLink } from 'react-router-dom'
import { Inbox, Settings, Zap } from 'lucide-react'

const NAV = [
  { to: '/', label: 'Inbox', icon: Inbox, end: true },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
]

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 flex flex-col bg-brand-dark border-r border-brand-border h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-brand-border">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-brand-neon" strokeWidth={2.5} />
          <span className="text-lg font-bold tracking-tight">
            <span className="text-slate-100">Ae</span>
            <span className="text-brand-purple">gis</span>
          </span>
        </div>
        <p className="text-[10px] text-slate-500 mt-0.5 font-mono uppercase tracking-widest">
          Unified Inbox
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-brand-border">
        <p className="text-[10px] text-slate-600 font-mono">v0.1.0</p>
      </div>
    </aside>
  )
}
