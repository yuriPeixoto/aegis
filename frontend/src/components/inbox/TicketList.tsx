import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import type { TicketFilters } from '../../types/ticket'
import { useTickets } from '../../hooks/useTickets'
import { TicketRow } from './TicketRow'

const PAGE_SIZE = 20

interface TicketListProps {
  filters: TicketFilters
  onSelect: (id: number) => void
  onOffsetChange: (offset: number) => void
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

export function TicketList({ filters, onSelect, onOffsetChange }: TicketListProps) {
  const { t } = useTranslation()
  const { data, isLoading } = useTickets({ ...filters, limit: PAGE_SIZE })
  const offset = filters.offset ?? 0
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  if (isLoading) {
    return (
      <div className="flex flex-col">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} />
        ))}
      </div>
    )
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 opacity-40">
        <Inbox className="w-8 h-8 text-brand-purple" />
        <p className="text-sm text-slate-400">{t('inbox.empty')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b border-brand-border/50">
        <span className="text-[10px] text-slate-500 font-mono">
          {t('inbox.ticketCount', { count: total })}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {data.items.map((ticket) => (
          <TicketRow
            key={ticket.id}
            ticket={ticket}
            onClick={() => onSelect(ticket.id)}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-brand-border/50 shrink-0">
          <button
            onClick={() => onOffsetChange(offset - PAGE_SIZE)}
            disabled={offset === 0}
            className="p-1 text-slate-500 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-mono text-slate-500">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onOffsetChange(offset + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= total}
            className="p-1 text-slate-500 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
