import { useTranslation } from 'react-i18next'
import type { TicketFilters, TicketStatus, TicketPriority, TicketType } from '../../types/ticket'
import { useSources } from '../../hooks/useTickets'
import { FilterSelect } from './FilterSelect'

interface FilterBarProps {
  filters: TicketFilters
  onChange: (filters: TicketFilters) => void
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const { t } = useTranslation()
  const { data: sources } = useSources()

  const STATUSES = [
    { value: 'OPEN',           label: t('status.OPEN') },
    { value: 'IN_PROGRESS',    label: t('status.IN_PROGRESS') },
    { value: 'WAITING_CLIENT', label: t('status.WAITING_CLIENT') },
    { value: 'WAITING_DEV',    label: t('status.WAITING_DEV') },
    { value: 'IN_DEV',         label: t('status.IN_DEV') },
    { value: 'WAITING_TEST',   label: t('status.WAITING_TEST') },
    { value: 'IN_TEST',        label: t('status.IN_TEST') },
    { value: 'RESOLVED',       label: t('status.RESOLVED') },
    { value: 'CLOSED',         label: t('status.CLOSED') },
    { value: 'CANCELLED',      label: t('status.CANCELLED') },
  ]

  const PRIORITIES = [
    { value: 'URGENT', label: t('priority.URGENT') },
    { value: 'HIGH',   label: t('priority.HIGH') },
    { value: 'MEDIUM', label: t('priority.MEDIUM') },
    { value: 'LOW',    label: t('priority.LOW') },
  ]

  const TYPES = [
    { value: 'BUG',         label: t('type.BUG') },
    { value: 'IMPROVEMENT', label: t('type.IMPROVEMENT') },
    { value: 'QUESTION',    label: t('type.QUESTION') },
    { value: 'SUPPORT',     label: t('type.SUPPORT') },
  ]

  const hasFilters = filters.source_id || filters.status || filters.priority || filters.type

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <FilterSelect
        value={filters.source_id?.toString()}
        onChange={(v) => onChange({ ...filters, source_id: v ? Number(v) : undefined, offset: 0 })}
        placeholder={t('inbox.allSources')}
        options={(Array.isArray(sources) ? sources : []).map((s) => ({
          value: s.id.toString(),
          label: s.name,
        }))}
      />
      <FilterSelect
        value={filters.status}
        onChange={(v) =>
          onChange({ ...filters, status: (v as TicketStatus) || undefined, offset: 0 })
        }
        placeholder={t('inbox.allStatuses')}
        options={STATUSES}
      />
      <FilterSelect
        value={filters.priority}
        onChange={(v) =>
          onChange({ ...filters, priority: (v as TicketPriority) || undefined, offset: 0 })
        }
        placeholder={t('inbox.allPriorities')}
        options={PRIORITIES}
      />
      <FilterSelect
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
          className="px-3 py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors cursor-pointer
            border border-transparent hover:border-brand-border rounded-lg"
        >
          {t('inbox.clearFilters')}
        </button>
      )}
    </div>
  )
}
