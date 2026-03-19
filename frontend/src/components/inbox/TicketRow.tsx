import type { Ticket } from '../../types/ticket'
import { StatusBadge } from './StatusBadge'
import { PriorityBadge } from './PriorityBadge'
import { TypeBadge } from './TypeBadge'
import { SlaBadge } from './SlaBadge'

interface TicketRowProps {
  ticket: Ticket
  isSelected: boolean
  onClick: () => void
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
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
          <span className="text-xs font-mono text-slate-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
            {ticket.source_name}
          </span>
          {ticket.type && <TypeBadge type={ticket.type} />}
        </div>
        <span className="text-xs text-slate-500 font-mono shrink-0">
          {formatDate(ticket.source_updated_at)}
        </span>
      </div>

      {/* Subject */}
      <p
        className={`text-base font-medium leading-snug mb-2 line-clamp-1
          ${isSelected ? 'text-slate-100' : 'text-slate-300 group-hover:text-slate-100'}`}
      >
        {ticket.subject}
      </p>

      {/* Bottom row: priority + status + assignee + external_id */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {ticket.priority && <PriorityBadge priority={ticket.priority} />}
          <StatusBadge status={ticket.status} />
          <SlaBadge status={ticket.sla_status} dueAt={ticket.sla_due_at} />
        </div>
        <div className="flex items-center gap-2">
          {ticket.assigned_to && (
            <span className="text-[10px] text-brand-purple/70 font-medium truncate max-w-[80px]">
              {ticket.assigned_to.name.split(' ')[0]}
            </span>
          )}
          <span className="text-xs font-mono text-slate-500">#{ticket.external_id}</span>
        </div>
      </div>
    </button>
  )
}
