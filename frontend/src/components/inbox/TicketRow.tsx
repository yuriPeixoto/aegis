import type { Ticket } from '../../types/ticket'
import { StatusBadge } from './StatusBadge'
import { PriorityBadge } from './PriorityBadge'
import { TypeBadge } from './TypeBadge'

interface TicketRowProps {
  ticket: Ticket
  isSelected: boolean
  onClick: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function TicketRow({ ticket, isSelected, onClick }: TicketRowProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-brand-border/50 transition-all duration-150
        hover:bg-white/5 group
        ${isSelected ? 'bg-brand-purple/10 border-l-2 border-l-brand-purple' : 'border-l-2 border-l-transparent'}`}
    >
      {/* Top row: source + type + date */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
            {ticket.source.name}
          </span>
          <TypeBadge type={ticket.type} />
        </div>
        <span className="text-[10px] text-slate-600 font-mono shrink-0">
          {formatDate(ticket.source_updated_at)}
        </span>
      </div>

      {/* Subject */}
      <p
        className={`text-sm font-medium leading-snug mb-2 line-clamp-1
          ${isSelected ? 'text-slate-100' : 'text-slate-300 group-hover:text-slate-100'}`}
      >
        {ticket.subject}
      </p>

      {/* Bottom row: priority + status + external_id */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
        </div>
        <span className="text-[10px] font-mono text-slate-600">#{ticket.external_id}</span>
      </div>
    </button>
  )
}
