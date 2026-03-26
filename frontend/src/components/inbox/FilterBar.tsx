import { useTranslation } from 'react-i18next'
import type { TicketFilters } from '../../types/ticket'
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
    { value: '__active__',     label: t('inbox.activeStatuses') },
    { value: 'open',           label: t('status.OPEN') },
    { value: 'in_progress',    label: t('status.IN_PROGRESS') },
    { value: 'waiting_client', label: t('status.WAITING_CLIENT') },
    { value: 'waiting_dev',    label: t('status.WAITING_DEV') },
    { value: 'in_dev',         label: t('status.IN_DEV') },
    { value: 'waiting_test',   label: t('status.WAITING_TEST') },
    { value: 'in_test',        label: t('status.IN_TEST') },
    { value: 'resolved',       label: t('status.RESOLVED') },
    { value: 'closed',         label: t('status.CLOSED') },
    { value: 'cancelled',      label: t('status.CANCELLED') },
  ]

  const PRIORITIES = [
    { value: 'urgent', label: t('priority.URGENT') },
    { value: 'high',   label: t('priority.HIGH') },
    { value: 'medium', label: t('priority.MEDIUM') },
    { value: 'low',    label: t('priority.LOW') },
  ]

  const TYPES = [
    { value: 'bug',         label: t('type.BUG') },
    { value: 'improvement', label: t('type.IMPROVEMENT') },
    { value: 'question',    label: t('type.QUESTION') },
    { value: 'support',     label: t('type.SUPPORT') },
  ]

  const statusSelectValue = filters.active_only ? '__active__' : (filters.status ?? '')

  const handleStatusChange = (v: string | undefined) => {
    if (v === '__active__') {
      onChange({ ...filters, active_only: true, status: undefined, offset: 0 })
    } else {
      onChange({ ...filters, active_only: undefined, status: v || undefined, offset: 0 })
    }
  }

  const hasFilters = filters.source_id || filters.status || filters.active_only || filters.priority || filters.type

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <FilterSelect
        value={filters.source_id?.toString()}
        onChange={(v) => onChange({ ...filters, source_id: v ? Number(v) : undefined, offset: 0 })}
        placeholder={t('inbox.allSources')}
        minWidth="220px"
        options={(Array.isArray(sources) ? sources : []).map((s) => ({
          value: s.id.toString(),
          label: s.name,
        }))}
      />
      <FilterSelect
        value={statusSelectValue}
        onChange={handleStatusChange}
        placeholder={t('inbox.allStatuses')}
        minWidth="170px"
        options={STATUSES}
      />
      <FilterSelect
        value={filters.priority}
        onChange={(v) => onChange({ ...filters, priority: v || undefined, offset: 0 })}
        placeholder={t('inbox.allPriorities')}
        options={PRIORITIES}
      />
      <FilterSelect
        value={filters.type}
        onChange={(v) => onChange({ ...filters, type: v || undefined, offset: 0 })}
        placeholder={t('inbox.allTypes')}
        options={TYPES}
      />
      {hasFilters && (
        <button
          onClick={() => onChange({ offset: 0 })}
          className="px-3 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors cursor-pointer
            border border-transparent hover:border-brand-border rounded-lg"
        >
          {t('inbox.clearFilters')}
        </button>
      )}
    </div>
  )
}
