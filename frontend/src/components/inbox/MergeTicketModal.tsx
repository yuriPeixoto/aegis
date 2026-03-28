import { useState, useEffect } from 'react'
import { GitMerge, Search, AlertTriangle, X } from 'lucide-react'
import { useTickets, useMergeTicket } from '../../hooks/useTickets'
import type { Ticket } from '../../types/ticket'

interface MergeTicketModalProps {
  sourceTicket: Ticket
  onClose: () => void
  onMerged: (targetTicketId: number) => void
}

export function MergeTicketModal({ sourceTicket, onClose, onMerged }: MergeTicketModalProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const { data } = useTickets({ search: search || undefined, limit: 8 })
  const candidates = (data?.items ?? []).filter(
    (t) => t.id !== sourceTicket.id && t.status !== 'merged',
  )

  const merge = useMergeTicket(sourceTicket.id)

  // Reset confirmation when selection changes
  useEffect(() => setConfirmed(false), [selected])

  function handleMerge() {
    if (!selected) return
    merge.mutate(
      { target_ticket_id: selected.id },
      {
        onSuccess: () => {
          onMerged(selected.id)
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[520px] bg-brand-surface border border-brand-border rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border/50">
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-brand-purple" />
            <span className="text-sm font-semibold text-slate-200">Mesclar ticket</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {/* Context */}
          <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-400">
            <span className="font-mono text-slate-300">#{sourceTicket.external_id}</span>
            {' '}será absorvido pelo ticket selecionado. As mensagens serão incorporadas à conversa do ticket principal.
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null) }}
              placeholder="Buscar ticket pelo ID ou assunto..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-accent"
            />
          </div>

          {/* Results */}
          {candidates.length > 0 && (
            <div className="space-y-1">
              {candidates.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelected(ticket)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    selected?.id === ticket.id
                      ? 'bg-brand-purple/15 border-brand-purple/40'
                      : 'bg-white/3 border-white/8 hover:bg-white/8'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-brand-purple shrink-0">
                      #{ticket.external_id}
                    </span>
                    <span className="text-xs text-slate-200 truncate">{ticket.subject}</span>
                    <span className="text-[10px] text-slate-500 shrink-0 ml-auto">{ticket.source_name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {search && candidates.length === 0 && (
            <p className="text-xs text-slate-600 italic text-center py-2">Nenhum ticket encontrado.</p>
          )}

          {/* Selected confirmation */}
          {selected && (
            <div className="border border-amber-700/40 bg-amber-950/30 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200 leading-relaxed">
                  <p className="font-semibold mb-1">Esta ação é irreversível.</p>
                  <p>
                    O ticket <span className="font-mono">#{sourceTicket.external_id}</span> será mesclado em{' '}
                    <span className="font-mono">#{selected.external_id}</span>. Suas mensagens serão
                    movidas para a conversa do ticket principal e este ticket ficará com status{' '}
                    <span className="font-semibold">Mesclado</span>.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800 text-brand-purple focus:ring-brand-purple"
                />
                <span className="text-xs text-slate-300">Entendo que esta ação não pode ser desfeita</span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-brand-border/50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs rounded-lg border border-white/15 text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!selected || !confirmed || merge.isPending}
            onClick={handleMerge}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-brand-purple text-white hover:bg-brand-purple/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <GitMerge className="w-3.5 h-3.5" />
            {merge.isPending ? 'Mesclando...' : 'Mesclar ticket'}
          </button>
        </div>
      </div>
    </div>
  )
}
