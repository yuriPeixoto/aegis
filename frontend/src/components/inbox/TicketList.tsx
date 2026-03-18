import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import type { TicketFilters } from '../../types/ticket'
import { useTickets } from '../../hooks/useTickets'
import { TicketRow } from './TicketRow'

interface TicketListProps {
  filters: TicketFilters
  selectedId: number | null
  onSelect: (id: number) => void
  onPageChange: (page: number) => void
}

function Skeleton() {
  return (
    <div className="animate-pulse px-4 py-3.5 border-b border-brand-border/50">
      <div className="flex justify-between mb-2">
        <div className="h-4 bg-white/5 rounded w-24" />
        <div className="h-4 bg-white/5 rounded w-16" />
      </div>
      <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
      <div className="flex gap-2">
        <div className="h-4 bg-white/5 rounded w-14" />
        <div className="h-4 bg-white/5 rounded w-20" />
      </div>
    </div>
  )
}

export function TicketList({ filters, selectedId, onSelect, onPageChange }: TicketListProps) {
  const { data, isLoading } = useTickets(filters)
  const page = filters.page ?? 1
  const pageSize = 20
  const totalPages = data ? Math.ceil(data.total / pageSize) : 1

  if (isLoading) {
    return (
      <div className="flex flex-col">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} />
        ))}
      </div>
    )
  }

  if (!data || data.tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 opacity-40">
        <Inbox className="w-8 h-8 text-brand-purple" />
        <p className="text-sm text-slate-400">Nenhum ticket encontrado</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Count */}
      <div className="px-4 py-2 border-b border-brand-border/50">
        <span className="text-[10px] text-slate-500 font-mono">
          {data.total} ticket{data.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {data.tickets.map((ticket) => (
          <TicketRow
            key={ticket.id}
            ticket={ticket}
            isSelected={ticket.id === selectedId}
            onClick={() => onSelect(ticket.id)}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-brand-border/50 shrink-0">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="p-1 text-slate-500 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-mono text-slate-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="p-1 text-slate-500 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
