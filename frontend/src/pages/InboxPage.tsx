import { useState } from 'react'
import type { TicketFilters } from '../types/ticket'
import { FilterBar } from '../components/inbox/FilterBar'
import { TicketList } from '../components/inbox/TicketList'
import { TicketDetail } from '../components/inbox/TicketDetail'

export function InboxPage() {
  const [filters, setFilters] = useState<TicketFilters>({ page: 1 })
  const [selectedId, setSelectedId] = useState<number | null>(null)

  function handleSelect(id: number) {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Filter bar */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Main grid */}
      <div
        className={`flex-1 min-h-0 grid gap-0 rounded-xl overflow-hidden border border-brand-border
          ${selectedId ? 'grid-cols-[1fr_420px]' : 'grid-cols-1'}`}
      >
        {/* Ticket list */}
        <div className="bg-brand-surface/50 overflow-hidden flex flex-col">
          <TicketList
            filters={filters}
            selectedId={selectedId}
            onSelect={handleSelect}
            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
          />
        </div>

        {/* Detail panel */}
        {selectedId && (
          <TicketDetail ticketId={selectedId} onClose={() => setSelectedId(null)} />
        )}
      </div>
    </div>
  )
}
