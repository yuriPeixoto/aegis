import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'
import type { TicketFilters } from '../../types/ticket'
import { useSources } from '../../hooks/useTickets'
import { useTags } from '../../hooks/useTags'
import { FilterSelect } from './FilterSelect'

interface FilterBarProps {
  filters: TicketFilters
  onChange: (filters: TicketFilters) => void
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const { t } = useTranslation()
  const { data: sources } = useSources()
  const { tags } = useTags()
  const searchRef = useRef<HTMLInputElement>(null)

  const STATUSES = [
    { value: '__active__',     label: t('inbox.activeStatuses') },
    { value: 'open',           label: t('status.OPEN') },
    { value: 'in_progress',    label: t('status.IN_PROGRESS') },
    { value: 'waiting_client', label: t('status.WAITING_CLIENT') },
    { value: 'waiting_dev',    label: t('status.WAITING_DEV') },
    { value: 'in_dev',         label: t('status.IN_DEV') },
    { value: 'pending_closure', label: t('status.PENDING_CLOSURE') },
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

  const hasFilters = filters.source_id || filters.status || filters.active_only || filters.priority || filters.type || filters.search || (filters.tag_ids && filters.tag_ids.length > 0)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
        <input
          ref={searchRef}
          type="text"
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined, offset: 0 })}
          placeholder={t('inbox.searchPlaceholder')}
          className="pl-7 pr-6 py-2 text-sm bg-brand-surface border border-brand-border rounded-lg text-slate-200
            placeholder:text-slate-500 focus:outline-none focus:border-brand-accent/60 w-64 transition-colors"
        />
        {filters.search && (
          <button
            onClick={() => { onChange({ ...filters, search: undefined, offset: 0 }); searchRef.current?.focus() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

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
      <FilterSelect
        value={filters.tag_ids?.[0]?.toString()}
        onChange={(v) => onChange({ ...filters, tag_ids: v ? [Number(v)] : undefined, offset: 0 })}
        placeholder={t('settings.nav.tags')}
        options={(tags || []).map((t) => ({
          value: t.id.toString(),
          label: t.name,
        }))}
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
