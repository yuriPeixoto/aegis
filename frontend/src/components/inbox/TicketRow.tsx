import type { Ticket } from '../../types/ticket'
import { StatusBadge } from './StatusBadge'
import { PriorityBadge } from './PriorityBadge'
import { TypeBadge } from './TypeBadge'
import { SlaBadge } from './SlaBadge'
import TagBadge from './TagBadge'

interface TicketRowProps {
  ticket: Ticket
  isSelected?: boolean
  isBulkSelected?: boolean
  onToggleBulk?: (id: number, multi: boolean) => void
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

export function TicketRow({
  ticket,
  isSelected,
  isBulkSelected,
  onToggleBulk,
  onClick,
}: TicketRowProps) {
  const lastViewed = localStorage.getItem(`ticket-viewed-${ticket.id}`)
  const hasUnread =
    ticket.last_inbound_at !== null &&
    (!lastViewed || ticket.last_inbound_at > lastViewed)

  return (
    <div
      className={`group flex items-stretch border-b border-brand-border/50 transition-all duration-150 border-l-2
        ${isSelected
          ? 'bg-white/10 border-l-brand-purple'
          : 'hover:bg-white/5 border-l-transparent hover:border-l-brand-purple/40'}
        ${isBulkSelected ? 'bg-brand-purple/5' : ''}`}
    >
      {/* Selection Checkbox Area */}
      {onToggleBulk && (
        <div
          onClick={(e) => {
            e.stopPropagation()
            onToggleBulk(ticket.id, e.shiftKey)
          }}
          className="w-10 flex items-center justify-center cursor-pointer hover:bg-white/5 shrink-0"
        >
          <div
            className={`w-4 h-4 rounded border transition-colors flex items-center justify-center
              ${isBulkSelected
                ? 'bg-brand-purple border-brand-purple text-white'
                : 'border-white/20 group-hover:border-white/40 bg-transparent'}`}
          >
            {isBulkSelected && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="w-2.5 h-2.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </div>
      )}

      <button
        onClick={onClick}
        className="flex-1 text-left px-4 py-3.5 outline-none focus:bg-white/5"
      >
      {/* Top row: source + type + date */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-slate-300 bg-white/5 border border-white/15 px-1.5 py-0.5 rounded">
            {ticket.source_name}
          </span>
          {ticket.type && <TypeBadge type={ticket.type} />}
        </div>
        <span className="text-xs text-slate-400 font-mono shrink-0">
          {formatDate(ticket.source_updated_at)}
        </span>
      </div>

      {/* Subject */}
      <div className="flex items-center gap-2 mb-2">
        {hasUnread && (
          <span
            className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse"
            title="Nova mensagem do cliente"
          />
        )}
        <p className="text-[15px] font-medium leading-snug line-clamp-1 text-slate-200 group-hover:text-white flex-1">
          {ticket.subject}
        </p>
      </div>

      {/* Tags row */}
      {ticket.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {ticket.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
        </div>
      )}

      {/* Bottom row: priority + status + assignee + external_id */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {ticket.priority && <PriorityBadge priority={ticket.priority} />}
          <StatusBadge status={ticket.status} />
          <SlaBadge status={ticket.sla_status} dueAt={ticket.sla_due_at} />
        </div>
        <div className="flex items-center gap-2">
          {ticket.assigned_to && (
            <span className="text-xs text-slate-300 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded truncate max-w-[100px]">
              {ticket.assigned_to.name.split(' ')[0]}
            </span>
          )}
          <span className="text-xs font-mono text-slate-400">#{ticket.external_id}</span>
        </div>
      </div>
      </button>
    </div>
  )
}
