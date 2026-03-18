import { useTranslation } from 'react-i18next'
import type { TicketFilters, TicketStatus, TicketPriority, TicketType } from '../../types/ticket'
import { useSources } from '../../hooks/useTickets'

interface FilterBarProps {
  filters: TicketFilters
  onChange: (filters: TicketFilters) => void
}

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
  const { t } = useTranslation()
  const { data: sources } = useSources()

  const STATUSES: { value: TicketStatus; label: string }[] = [
    { value: 'ABERTO', label: t('status.ABERTO') },
    { value: 'EM_ATENDIMENTO', label: t('status.EM_ATENDIMENTO') },
    { value: 'AGUARDANDO_CLIENTE', label: t('status.AGUARDANDO_CLIENTE') },
    { value: 'AGUARDANDO_DESENVOLVIMENTO', label: t('status.AGUARDANDO_DESENVOLVIMENTO') },
    { value: 'EM_DESENVOLVIMENTO', label: t('status.EM_DESENVOLVIMENTO') },
    { value: 'AGUARDANDO_TESTE', label: t('status.AGUARDANDO_TESTE') },
    { value: 'EM_TESTE', label: t('status.EM_TESTE') },
    { value: 'RESOLVIDO', label: t('status.RESOLVIDO') },
    { value: 'FECHADO', label: t('status.FECHADO') },
    { value: 'CANCELADO', label: t('status.CANCELADO') },
  ]

  const PRIORITIES: { value: TicketPriority; label: string }[] = [
    { value: 'URGENTE', label: t('priority.URGENTE') },
    { value: 'ALTO', label: t('priority.ALTO') },
    { value: 'MEDIO', label: t('priority.MEDIO') },
    { value: 'BAIXO', label: t('priority.BAIXO') },
  ]

  const TYPES: { value: TicketType; label: string }[] = [
    { value: 'BUG', label: t('type.BUG') },
    { value: 'MELHORIA', label: t('type.MELHORIA') },
    { value: 'DUVIDA', label: t('type.DUVIDA') },
    { value: 'SUPORTE', label: t('type.SUPORTE') },
  ]

  const hasFilters = filters.source_id || filters.status || filters.priority || filters.type

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select
        value={filters.source_id?.toString()}
        onChange={(v) => onChange({ ...filters, source_id: v ? Number(v) : undefined, offset: 0 })}
        placeholder={t('inbox.allSources')}
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
        placeholder={t('inbox.allStatuses')}
        options={STATUSES}
      />
      <Select
        value={filters.priority}
        onChange={(v) =>
          onChange({ ...filters, priority: (v as TicketPriority) || undefined, offset: 0 })
        }
        placeholder={t('inbox.allPriorities')}
        options={PRIORITIES}
      />
      <Select
        value={filters.type}
        onChange={(v) =>
          onChange({ ...filters, type: (v as TicketType) || undefined, offset: 0 })
        }
        placeholder={t('inbox.allTypes')}
        options={TYPES}
      />
      {hasFilters && (
        <button
          onClick={() => onChange({ offset: 0 })}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-mono underline underline-offset-2"
        >
          {t('inbox.clearFilters')}
        </button>
      )}
    </div>
  )
}
