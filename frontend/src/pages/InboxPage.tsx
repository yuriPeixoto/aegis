import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { TicketFilters } from '../types/ticket'
import { FilterBar } from '../components/inbox/FilterBar'
import { TicketList } from '../components/inbox/TicketList'
import { useMe } from '../hooks/useAuth'

type Queue = 'mine' | 'unassigned' | 'all'

export function InboxPage() {
  const { t } = useTranslation()
  const { data: me } = useMe()
  const navigate = useNavigate()
  const [queue, setQueue] = useState<Queue>('unassigned')
  const [filters, setFilters] = useState<TicketFilters>({ offset: 0 })

  function queueFilters(): Pick<TicketFilters, 'assigned_to_user_id' | 'unassigned'> {
    if (queue === 'mine' && me) return { assigned_to_user_id: me.id }
    if (queue === 'unassigned') return { unassigned: true }
    return {}
  }

  const tabs: { key: Queue; label: string }[] = [
    { key: 'mine', label: t('inbox.queue.mine') },
    { key: 'unassigned', label: t('inbox.queue.unassigned') },
    { key: 'all', label: t('inbox.queue.all') },
  ]

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-white/5 border border-brand-border rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setQueue(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer
                ${queue === tab.key
                  ? 'bg-brand-purple text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <FilterBar filters={filters} onChange={setFilters} />
      </div>

      <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-brand-border bg-brand-surface/50 flex flex-col">
        <TicketList
          filters={{ ...filters, ...queueFilters() }}
          onSelect={(id) => navigate(`/tickets/${id}`)}
          onOffsetChange={(offset) => setFilters((f) => ({ ...f, offset }))}
        />
      </div>
    </div>
  )
}
