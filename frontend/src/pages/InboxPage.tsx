import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TicketFilters } from '../types/ticket'
import { FilterBar } from '../components/inbox/FilterBar'
import { TicketList } from '../components/inbox/TicketList'
import { TicketDetail } from '../components/inbox/TicketDetail'

export function InboxPage() {
  const { i18n } = useTranslation()
  const [filters, setFilters] = useState<TicketFilters>({ offset: 0 })
  const [selectedId, setSelectedId] = useState<number | null>(null)

  function handleSelect(id: number) {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <FilterBar filters={filters} onChange={setFilters} />

      <div
        className={`flex-1 min-h-0 grid gap-0 rounded-xl overflow-hidden border border-brand-border
          ${selectedId ? 'grid-cols-[1fr_420px]' : 'grid-cols-1'}`}
      >
        <div className="bg-brand-surface/50 overflow-hidden flex flex-col">
          <TicketList
            key={i18n.language}
            filters={filters}
            selectedId={selectedId}
            onSelect={handleSelect}
            onOffsetChange={(offset) => setFilters((f) => ({ ...f, offset }))}
          />
        </div>

        {selectedId && (
          <TicketDetail
            key={`${selectedId}-${i18n.language}`}
            ticketId={selectedId}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  )
}
