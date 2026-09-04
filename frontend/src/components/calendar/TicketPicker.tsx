import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { TFunction } from 'i18next'
import type { Ticket } from '../../types/ticket'
import { useTickets } from '../../hooks/useTickets'

interface TicketPickerProps {
  currentUserId: number
  selected: Ticket | null
  onSelect: (ticket: Ticket | null) => void
  disabled?: boolean
  t: TFunction
}

// Busca-e-seleciona entre os próprios chamados ativos (#602) — escolher um
// preenche título/cor automaticamente no EventModal. Só entre os MEUS
// tickets: tarefa é sempre individual (#598), não faz sentido agendar um
// chamado de outra pessoa aqui.
export function TicketPicker({ currentUserId, selected, onSelect, disabled, t }: TicketPickerProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(id)
  }, [query])

  const { data } = useTickets({
    search: debouncedQuery || undefined,
    assigned_to_user_id: currentUserId,
    active_only: true,
    limit: 10,
  })
  const results = data?.items ?? []

  if (selected) {
    return (
      <div className="flex items-center gap-2 bg-brand-surface border border-brand-border rounded-md px-3 py-2">
        <span className="text-xs text-slate-500 shrink-0">#{selected.external_id}</span>
        <span className="text-sm text-slate-200 truncate flex-1">{selected.subject}</span>
        {!disabled && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-slate-500 hover:text-slate-300 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={disabled}
        placeholder={t('calendar.modal.ticketPickerPlaceholder')}
        className="w-full bg-brand-surface border border-brand-border rounded-md px-3 py-2 text-sm text-slate-200 placeholder-slate-600 disabled:opacity-50"
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-brand-dark border border-brand-border rounded-md shadow-xl">
          {results.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(ticket)
                setQuery('')
                setOpen(false)
              }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 border-b border-brand-border/50 last:border-b-0"
            >
              <span className="text-slate-500">#{ticket.external_id}</span>{' '}
              <span className="text-slate-200">{ticket.subject}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
