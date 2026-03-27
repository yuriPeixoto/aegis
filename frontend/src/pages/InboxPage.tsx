import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { TicketFilters } from '../types/ticket'
import { FilterBar } from '../components/inbox/FilterBar'
import { TicketList } from '../components/inbox/TicketList'
import { BulkActionBar } from '../components/inbox/BulkActionBar'
import { useMe } from '../hooks/useAuth'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { useTickets } from '../hooks/useTickets'

const PAGE_SIZE = 20

type Queue = 'mine' | 'unassigned' | 'all'

export function InboxPage() {
  const { t } = useTranslation()
  const { data: me } = useMe()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [queue, setQueue] = useState<Queue>('mine')
  const [filters, setFilters] = useState<TicketFilters>({ offset: 0, active_only: true })
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const combinedFilters = useMemo(() => {
    const qf: Pick<TicketFilters, 'assigned_to_user_id' | 'unassigned'> = {}
    if (queue === 'mine' && me) qf.assigned_to_user_id = me.id
    else if (queue === 'unassigned') qf.unassigned = true
    return { ...filters, ...qf, limit: PAGE_SIZE }
  }, [filters, queue, me])

  const { data: ticketsData } = useTickets(combinedFilters)
  const tickets = ticketsData?.items ?? []

  const handleToggleBulk = useCallback((id: number, multi: boolean) => {
    setSelectedIds((prev) => {
      if (multi && prev.length > 0) {
        // Find indices in current tickets list
        const lastId = prev[prev.length - 1]
        const lastIdx = tickets.findIndex(t => t.id === lastId)
        const currentIdx = tickets.findIndex(t => t.id === id)

        if (lastIdx !== -1 && currentIdx !== -1) {
          const start = Math.min(lastIdx, currentIdx)
          const end = Math.max(lastIdx, currentIdx)
          const rangeIds = tickets.slice(start, end + 1).map(t => t.id)
          // Add all unique IDs from range
          return Array.from(new Set([...prev, ...rangeIds]))
        }
      }

      if (prev.includes(id)) {
        return prev.filter(i => i !== id)
      }
      return [...prev, id]
    })
  }, [tickets])

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tickets'] })
  }, [queryClient])

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev < tickets.length - 1 ? prev + 1 : prev))
  }, [tickets.length])

  const handlePrev = useCallback(() => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
  }, [])

  const handleOpenTicket = useCallback(() => {
    if (selectedIndex >= 0 && tickets[selectedIndex]) {
      navigate(`/tickets/${tickets[selectedIndex].id}`)
    }
  }, [navigate, selectedIndex, tickets])

  useKeyboardShortcut('j', handleNext)
  useKeyboardShortcut('k', handlePrev)
  useKeyboardShortcut('r', handleRefresh)
  useKeyboardShortcut('enter', handleOpenTicket)
  useKeyboardShortcut('esc', () => setSelectedIds([]))

  // Bulk Actions shortcuts
  useKeyboardShortcut('a', () => {
    if (selectedIds.length > 0) {
      document.getElementById('bulk-assign-button')?.focus();
    }
  })
  useKeyboardShortcut('s', () => {
    if (selectedIds.length > 0) {
      document.getElementById('bulk-status-button')?.focus();
    }
  })
  useKeyboardShortcut('p', () => {
    if (selectedIds.length > 0) {
      document.getElementById('bulk-priority-button')?.focus();
    }
  })

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

      <BulkActionBar
        selectedIds={selectedIds}
        onClear={() => setSelectedIds([])}
      />
    </div>
  )
}
