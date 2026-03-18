import type { TicketFilters, TicketStatus, TicketPriority, TicketType } from '../../types/ticket'
import { useSources } from '../../hooks/useTickets'

interface FilterBarProps {
  filters: TicketFilters
  onChange: (filters: TicketFilters) => void
}

const STATUSES: { value: TicketStatus; label: string }[] = [
  { value: 'ABERTO', label: 'Aberto' },
  { value: 'EM_ATENDIMENTO', label: 'Em Atendimento' },
  { value: 'AGUARDANDO_CLIENTE', label: 'Ag. Cliente' },
  { value: 'AGUARDANDO_DESENVOLVIMENTO', label: 'Ag. Dev' },
  { value: 'EM_DESENVOLVIMENTO', label: 'Em Dev' },
  { value: 'AGUARDANDO_TESTE', label: 'Ag. Teste' },
  { value: 'EM_TESTE', label: 'Em Teste' },
  { value: 'RESOLVIDO', label: 'Resolvido' },
  { value: 'FECHADO', label: 'Fechado' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

const PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: 'URGENTE', label: 'Urgente' },
  { value: 'ALTO', label: 'Alto' },
  { value: 'MEDIO', label: 'Médio' },
  { value: 'BAIXO', label: 'Baixo' },
]

const TYPES: { value: TicketType; label: string }[] = [
  { value: 'BUG', label: 'Bug' },
  { value: 'MELHORIA', label: 'Melhoria' },
  { value: 'DUVIDA', label: 'Dúvida' },
  { value: 'SUPORTE', label: 'Suporte' },
]

function Select({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string | undefined
  onChange: (v: string) => void
  placeholder: string
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="bg-brand-surface border border-brand-border text-slate-300 text-xs rounded-lg px-3 py-2
                 focus:outline-none focus:border-brand-purple transition-colors cursor-pointer"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const { data: sources } = useSources()

  const hasFilters = filters.source_id || filters.status || filters.priority || filters.type

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select
        value={filters.source_id?.toString()}
        onChange={(v) => onChange({ ...filters, source_id: v ? Number(v) : undefined, offset: 0 })}
        placeholder="Todas as fontes"
        options={(Array.isArray(sources) ? sources : []).map((s) => ({
          value: s.id.toString(),
          label: s.name,
        }))}
      />
      <Select
        value={filters.status}
        onChange={(v) =>
          onChange({ ...filters, status: (v as TicketStatus) || undefined, offset: 0 })
        }
        placeholder="Todos os status"
        options={STATUSES}
      />
      <Select
        value={filters.priority}
        onChange={(v) =>
          onChange({ ...filters, priority: (v as TicketPriority) || undefined, offset: 0 })
        }
        placeholder="Todas as prioridades"
        options={PRIORITIES}
      />
      <Select
        value={filters.type}
        onChange={(v) =>
          onChange({ ...filters, type: (v as TicketType) || undefined, offset: 0 })
        }
        placeholder="Todos os tipos"
        options={TYPES}
      />
      {hasFilters && (
        <button
          onClick={() => onChange({ offset: 0 })}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-mono underline underline-offset-2"
        >
          Limpar
        </button>
      )}
    </div>
  )
}
