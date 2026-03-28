import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Bookmark } from 'lucide-react'
import type { TicketFilters } from '../types/ticket'
import { FilterBar } from '../components/inbox/FilterBar'
import { TicketList } from '../components/inbox/TicketList'
import { BulkActionBar } from '../components/inbox/BulkActionBar'
import { SaveViewModal } from '../components/inbox/SaveViewModal'
import { useMe } from '../hooks/useAuth'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { useTickets } from '../hooks/useTickets'
import { useSavedViews, applyViewFilters, filtersToViewFilters } from '../hooks/useSavedViews'

const PAGE_SIZE = 20

type Queue = 'mine' | 'unassigned' | 'all'

export function InboxPage() {
  const { t } = useTranslation()
  const { data: me } = useMe()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: views = [] } = useSavedViews()

  const viewIdParam = searchParams.get('view')
  const activeViewId = viewIdParam ? Number(viewIdParam) : null
  const activeView = activeViewId ? views.find((v) => v.id === activeViewId) : null

  const [queue, setQueue] = useState<Queue>('mine')
  const [filters, setFilters] = useState<TicketFilters>({ offset: 0, active_only: true })
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showSaveModal, setShowSaveModal] = useState(false)

  // When a view is active, derive filters from the view; otherwise use local state
  const effectiveFilters = useMemo<TicketFilters>(() => {
    if (activeView && me) {
      return applyViewFilters(activeView.filters, me.id)
    }
    return filters
  }, [activeView, filters, me])

  const combinedFilters = useMemo(() => {
    // Queue only applies when no view is active
    const qf: Pick<TicketFilters, 'assigned_to_user_id' | 'unassigned'> = {}
    if (!activeView) {
      if (queue === 'mine' && me) qf.assigned_to_user_id = me.id
      else if (queue === 'unassigned') qf.unassigned = true
    }
    return { ...effectiveFilters, ...qf, limit: PAGE_SIZE }
  }, [effectiveFilters, queue, me, activeView])

  const { data: ticketsData } = useTickets(combinedFilters)
  const tickets = ticketsData?.items ?? []

  // Filters to potentially save — effective + queue merged
  const filtersForSave = useMemo(() => {
    if (!me) return {}
    return filtersToViewFilters(combinedFilters, me.id)
  }, [combinedFilters, me])

  const hasFilters = !!(
    filters.source_id || filters.status || filters.active_only !== undefined ||
    filters.priority || filters.type || filters.search ||
    (filters.tag_ids && filters.tag_ids.length > 0) ||
    queue !== 'all'
  )

  function handleFilterChange(newFilters: TicketFilters) {
    // Changing filters manually deactivates the current view
    if (activeViewId) setSearchParams({})
    setFilters(newFilters)
  }

  function handleQueueChange(q: Queue) {
    if (activeViewId) setSearchParams({})
    setQueue(q)
  }

  const handleToggleBulk = useCallback((id: number, multi: boolean) => {
    setSelectedIds((prev) => {
      if (multi && prev.length > 0) {
        const lastId = prev[prev.length - 1]
        const lastIdx = tickets.findIndex(t => t.id === lastId)
        const currentIdx = tickets.findIndex(t => t.id === id)
        if (lastIdx !== -1 && currentIdx !== -1) {
          const start = Math.min(lastIdx, currentIdx)
          const end = Math.max(lastIdx, currentIdx)
          const rangeIds = tickets.slice(start, end + 1).map(t => t.id)
          return Array.from(new Set([...prev, ...rangeIds]))
        }
      }
      if (prev.includes(id)) return prev.filter(i => i !== id)
      return [...prev, id]
    })
  }, [tickets])

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tickets'] })
  }, [queryClient])

  const handleNext     = useCallback(() => setSelectedIndex((p) => (p < tickets.length - 1 ? p + 1 : p)), [tickets.length])
  const handlePrev     = useCallback(() => setSelectedIndex((p) => (p > 0 ? p - 1 : p)), [])
  const handleOpenTicket = useCallback(() => {
    if (selectedIndex >= 0 && tickets[selectedIndex]) navigate(`/tickets/${tickets[selectedIndex].id}`)
  }, [navigate, selectedIndex, tickets])

  useKeyboardShortcut('j', handleNext)
  useKeyboardShortcut('k', handlePrev)
  useKeyboardShortcut('r', handleRefresh)
  useKeyboardShortcut('enter', handleOpenTicket)
  useKeyboardShortcut('esc', () => setSelectedIds([]))
  useKeyboardShortcut('a', () => { if (selectedIds.length > 0) document.getElementById('bulk-assign-button')?.focus() })
  useKeyboardShortcut('s', () => { if (selectedIds.length > 0) document.getElementById('bulk-status-button')?.focus() })
  useKeyboardShortcut('p', () => { if (selectedIds.length > 0) document.getElementById('bulk-priority-button')?.focus() })

  const tabs: { key: Queue; label: string }[] = [
    { key: 'mine',       label: t('inbox.queue.mine') },
    { key: 'unassigned', label: t('inbox.queue.unassigned') },
    { key: 'all',        label: t('inbox.queue.all') },
  ]

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Queue tabs — dimmed when a view is active */}
        <div className={`flex items-center gap-1 bg-white/5 border border-brand-border rounded-lg p-1 transition-opacity ${activeView ? 'opacity-40' : ''}`}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleQueueChange(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer
                ${queue === tab.key && !activeView
                  ? 'bg-brand-purple text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Active view badge */}
          {activeView && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-brand-purple/15 border border-brand-purple/30 rounded-lg">
              <span className="text-sm leading-none">{activeView.icon}</span>
              <span className="text-xs font-medium text-brand-purple">{activeView.name}</span>
              <button
                onClick={() => setSearchParams({})}
                className="text-brand-purple/60 hover:text-brand-purple transition-colors ml-0.5"
                title="Limpar vista"
              >
                ×
              </button>
            </div>
          )}

          <FilterBar filters={activeView ? effectiveFilters : filters} onChange={handleFilterChange} />

          {/* Save as view button — shown when there are active filters */}
          {hasFilters && !activeView && (
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 border border-brand-border hover:border-slate-600 rounded-lg transition-colors"
              title="Salvar filtros como vista"
            >
              <Bookmark className="w-3.5 h-3.5" />
              Salvar vista
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-brand-border bg-brand-surface/50 flex flex-col">
        <TicketList
          filters={combinedFilters}
          selectedIndex={selectedIndex}
          selectedIds={selectedIds}
          onToggleBulk={handleToggleBulk}
          onSelect={(id) => navigate(`/tickets/${id}`)}
          onOffsetChange={(offset) => {
            setFilters((f) => ({ ...f, offset }))
            setSelectedIndex(-1)
            setSelectedIds([])
          }}
        />
      </div>

      <BulkActionBar selectedIds={selectedIds} onClear={() => setSelectedIds([])} />

      {showSaveModal && (
        <SaveViewModal
          filters={filtersForSave}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  )
}
