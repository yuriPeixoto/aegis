import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMe } from '../hooks/useAuth'
import { useSources, useCreateSource, type SourceCreated } from '../hooks/useSources'
import { useAllUsers, useCreateUser, useUpdateUser } from '../hooks/useUsers'
import { useSlaSettings, useUpdateBusinessHours, useUpdateSlaPolicy, useCreateHoliday, useDeleteHoliday } from '../hooks/useSlaSettings'
import type { User } from '../hooks/useAuth'

export function SettingsPage() {
  const { t } = useTranslation()
  const { data: user } = useMe()

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-slate-500">{t('settings.forbidden')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-10">
      <UsersSection currentUserId={user.id} />
      <div className="border-t border-brand-border" />
      <SourcesSection />
      <div className="border-t border-brand-border" />
      <SlaSection />
    </div>
  )
}

interface UsersSectionProps {
  currentUserId: number
}

function UsersSection({ currentUserId }: UsersSectionProps) {
  const { t } = useTranslation()
  const { data: users, isLoading } = useAllUsers()
  const [showModal, setShowModal] = useState(false)

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-200">{t('settings.users.title')}</h2>
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1.5 text-sm rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors"
        >
          {t('settings.users.new')}
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">{t('inbox.loading')}</p>
      ) : !users?.length ? (
        <p className="text-sm text-slate-500">{t('settings.users.empty')}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
              <th className="pb-2 font-medium">{t('settings.users.colName')}</th>
              <th className="pb-2 font-medium">{t('settings.users.colEmail')}</th>
              <th className="pb-2 font-medium">{t('settings.users.colRole')}</th>
              <th className="pb-2 font-medium">{t('settings.users.colStatus')}</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow key={u.id} user={u} isSelf={u.id === currentUserId} />
            ))}
          </tbody>
        </table>
      )}

      {showModal && <CreateUserModal onClose={() => setShowModal(false)} />}
    </section>
  )
}

interface UserRowProps {
  user: User
  isSelf: boolean
}

function UserRow({ user, isSelf }: UserRowProps) {
  const { t } = useTranslation()
  const updateUser = useUpdateUser(user.id)

  const toggleActive = () => {
    updateUser.mutate({ is_active: !user.is_active })
  }

  const toggleRole = () => {
    updateUser.mutate({ role: user.role === 'admin' ? 'agent' : 'admin' })
  }

  return (
    <tr className="border-b border-slate-800">
      <td className="py-2.5 text-slate-200">
        {user.name}
        {isSelf && (
          <span className="ml-2 text-[10px] text-brand-accent border border-brand-accent/30 rounded px-1 py-0.5">
            {t('settings.users.you')}
          </span>
        )}
      </td>
      <td className="py-2.5 text-slate-400 text-xs">{user.email}</td>
      <td className="py-2.5">
        {isSelf ? (
          <span className="text-xs text-slate-400">{t(`settings.users.role.${user.role}`)}</span>
        ) : (
          <button
            onClick={toggleRole}
            disabled={updateUser.isPending}
            className="text-xs text-slate-400 hover:text-slate-200 underline decoration-dotted transition-colors disabled:opacity-50"
          >
            {t(`settings.users.role.${user.role}`)}
          </button>
        )}
      </td>
      <td className="py-2.5">
        {user.is_active ? (
          <span className="text-xs text-emerald-400">{t('settings.users.active')}</span>
        ) : (
          <span className="text-xs text-slate-500">{t('settings.users.inactive')}</span>
        )}
      </td>
      <td className="py-2.5 text-right">
        {!isSelf && (
          <button
            onClick={toggleActive}
            disabled={updateUser.isPending}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
          >
            {user.is_active ? t('settings.users.deactivate') : t('settings.users.activate')}
          </button>
        )}
      </td>
    </tr>
  )
}

interface CreateUserModalProps {
  onClose: () => void
}

function CreateUserModal({ onClose }: CreateUserModalProps) {
  const { t } = useTranslation()
  const { mutate, isPending, error } = useCreateUser()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('agent')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate({ name, email, password, role }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-slate-200 mb-4">
          {t('settings.users.modalTitle')}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('settings.users.fieldName')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('settings.users.fieldEmail')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('settings.users.fieldPassword')}
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="off"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-brand-accent"
              placeholder="••••••••"
            />
            <p className="text-xs text-slate-500 mt-1">{t('settings.users.passwordHint')}</p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('settings.users.fieldRole')}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-accent"
            >
              <option value="agent">{t('settings.users.role.agent')}</option>
              <option value="admin">{t('settings.users.role.admin')}</option>
              <option value="viewer">{t('settings.users.role.viewer')}</option>
            </select>
          </div>

          {error && (
            <p className="text-xs text-red-400">
              {(error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
                t('settings.users.errorGeneric')}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              {t('settings.sources.cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-3 py-1.5 text-sm rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? t('settings.users.creating') : t('settings.users.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SourcesSection() {
  const { t } = useTranslation()
  const { data: sources, isLoading } = useSources()
  const [showModal, setShowModal] = useState(false)
  const [createdSource, setCreatedSource] = useState<SourceCreated | null>(null)

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-200">{t('settings.sources.title')}</h2>
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1.5 text-sm rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors"
        >
          {t('settings.sources.new')}
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">{t('inbox.loading')}</p>
      ) : !sources?.length ? (
        <p className="text-sm text-slate-500">{t('settings.sources.empty')}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
              <th className="pb-2 font-medium">{t('settings.sources.colName')}</th>
              <th className="pb-2 font-medium">{t('settings.sources.colSlug')}</th>
              <th className="pb-2 font-medium">{t('settings.sources.colStatus')}</th>
              <th className="pb-2 font-medium">{t('settings.sources.colCreated')}</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} className="border-b border-slate-800">
                <td className="py-2.5 text-slate-200">{source.name}</td>
                <td className="py-2.5 text-slate-400 font-mono text-xs">{source.slug}</td>
                <td className="py-2.5">
                  {source.is_active ? (
                    <span className="text-xs text-emerald-400">{t('settings.sources.active')}</span>
                  ) : (
                    <span className="text-xs text-slate-500">{t('settings.sources.inactive')}</span>
                  )}
                </td>
                <td className="py-2.5 text-slate-500 text-xs">
                  {new Date(source.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <CreateSourceModal
          onClose={() => setShowModal(false)}
          onCreated={(s) => {
            setShowModal(false)
            setCreatedSource(s)
          }}
        />
      )}

      {createdSource && (
        <ApiKeyAlert source={createdSource} onClose={() => setCreatedSource(null)} />
      )}
    </section>
  )
}

interface CreateSourceModalProps {
  onClose: () => void
  onCreated: (source: SourceCreated) => void
}

function CreateSourceModal({ onClose, onCreated }: CreateSourceModalProps) {
  const { t } = useTranslation()
  const { mutate, isPending, error } = useCreateSource()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  const handleNameChange = (value: string) => {
    setName(value)
    setSlug(value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate({ name, slug }, { onSuccess: onCreated })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-slate-200 mb-4">
          {t('settings.sources.modalTitle')}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('settings.sources.fieldName')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              minLength={2}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('settings.sources.fieldSlug')}
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              minLength={2}
              pattern="^[a-z0-9-]+$"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-400 font-mono focus:outline-none focus:border-brand-accent"
            />
            <p className="text-xs text-slate-600 mt-1">{t('settings.sources.slugHint')}</p>
          </div>

          {error && (
            <p className="text-xs text-red-400">
              {(error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
                t('settings.sources.errorGeneric')}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              {t('settings.sources.cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-3 py-1.5 text-sm rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? t('settings.sources.creating') : t('settings.sources.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── SLA Section ──────────────────────────────────────────────────────────────

const DAYS = [
  { iso: 1, label: 'Seg' },
  { iso: 2, label: 'Ter' },
  { iso: 3, label: 'Qua' },
  { iso: 4, label: 'Qui' },
  { iso: 5, label: 'Sex' },
  { iso: 6, label: 'Sáb' },
  { iso: 7, label: 'Dom' },
]

function SlaSection() {
  const { t } = useTranslation()
  const { data, isLoading } = useSlaSettings()
  const updateBH = useUpdateBusinessHours()
  const updatePolicy = useUpdateSlaPolicy()

  // Business hours form state
  const [workDays, setWorkDays] = useState<number[]>([])
  const [workStart, setWorkStart] = useState('')
  const [workEnd, setWorkEnd] = useState('')
  const [lunchStart, setLunchStart] = useState('')
  const [lunchEnd, setLunchEnd] = useState('')
  const [timezone, setTimezone] = useState('')
  const [bhDirty, setBhDirty] = useState(false)
  const [bhSaved, setBhSaved] = useState(false)

  // Policy inline editing state: { priority → hours string }
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null)
  const [editingHours, setEditingHours] = useState('')

  useEffect(() => {
    if (!data) return
    const bh = data.business_hours
    setWorkDays(bh.work_days)
    setWorkStart(bh.work_start)
    setWorkEnd(bh.work_end)
    setLunchStart(bh.lunch_start ?? '')
    setLunchEnd(bh.lunch_end ?? '')
    setTimezone(bh.timezone)
    setBhDirty(false)
  }, [data])

  const handleDayToggle = (iso: number) => {
    setWorkDays((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort()
    )
    setBhDirty(true)
  }

  const handleBhSave = () => {
    updateBH.mutate(
      {
        work_days: workDays,
        work_start: workStart,
        work_end: workEnd,
        lunch_start: lunchStart || null,
        lunch_end: lunchEnd || null,
        timezone,
      },
      {
        onSuccess: () => {
          setBhDirty(false)
          setBhSaved(true)
          setTimeout(() => setBhSaved(false), 2000)
        },
      },
    )
  }

  const handlePolicySave = (priority: string) => {
    const hours = parseInt(editingHours, 10)
    if (!hours || hours < 1) return
    updatePolicy.mutate(
      { priority, resolution_hours: hours },
      { onSuccess: () => setEditingPolicy(null) },
    )
  }

  if (isLoading) {
    return (
      <section>
        <h2 className="text-base font-semibold text-slate-200 mb-4">{t('settings.sla.title')}</h2>
        <p className="text-sm text-slate-500">{t('inbox.loading')}</p>
      </section>
    )
  }

  return (
    <section className="space-y-8">
      <h2 className="text-base font-semibold text-slate-200">{t('settings.sla.title')}</h2>

      {/* Business Hours */}
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-3">{t('settings.sla.businessHours.title')}</h3>
        <div className="space-y-4">
          {/* Work days */}
          <div>
            <label className="block text-xs text-slate-500 mb-2">{t('settings.sla.businessHours.workDays')}</label>
            <div className="flex gap-2">
              {DAYS.map(({ iso, label }) => (
                <button
                  key={iso}
                  onClick={() => handleDayToggle(iso)}
                  className={`text-xs font-medium px-2.5 py-1 rounded border transition-colors ${
                    workDays.includes(iso)
                      ? 'bg-brand-accent/20 border-brand-accent/50 text-brand-accent'
                      : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('settings.sla.businessHours.workStart')}</label>
              <input
                type="time"
                value={workStart}
                onChange={(e) => { setWorkStart(e.target.value); setBhDirty(true) }}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('settings.sla.businessHours.workEnd')}</label>
              <input
                type="time"
                value={workEnd}
                onChange={(e) => { setWorkEnd(e.target.value); setBhDirty(true) }}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('settings.sla.businessHours.lunchStart')}</label>
              <input
                type="time"
                value={lunchStart}
                onChange={(e) => { setLunchStart(e.target.value); setBhDirty(true) }}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('settings.sla.businessHours.lunchEnd')}</label>
              <input
                type="time"
                value={lunchEnd}
                onChange={(e) => { setLunchEnd(e.target.value); setBhDirty(true) }}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-accent"
              />
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">{t('settings.sla.businessHours.timezone')}</label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => { setTimezone(e.target.value); setBhDirty(true) }}
              placeholder="America/Sao_Paulo"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-brand-accent"
            />
            <p className="text-xs text-slate-600 mt-1">
              {t('settings.sla.businessHours.timezoneHint')}
            </p>
          </div>

          <button
            onClick={handleBhSave}
            disabled={!bhDirty || updateBH.isPending}
            className="px-3 py-1.5 text-sm rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 disabled:opacity-40 transition-colors"
          >
            {updateBH.isPending 
              ? t('settings.sla.businessHours.saving') 
              : bhSaved 
                ? t('settings.sla.businessHours.saved') 
                : t('settings.sla.businessHours.save')}
          </button>
        </div>
      </div>

      {/* SLA Policies */}
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-3">{t('settings.sla.policies.title')}</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
              <th className="pb-2 font-medium">{t('settings.sla.policies.colPriority')}</th>
              <th className="pb-2 font-medium">{t('settings.sla.policies.colHours')}</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(data?.policies ?? []).map((policy) => (
              <tr key={policy.priority} className="border-b border-slate-800">
                <td className="py-2.5 text-slate-200">
                  {t(`priority.${policy.priority.toUpperCase()}`)}
                </td>
                <td className="py-2.5">
                  {editingPolicy === policy.priority ? (
                    <input
                      type="number"
                      min={1}
                      value={editingHours}
                      onChange={(e) => setEditingHours(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handlePolicySave(policy.priority)
                        if (e.key === 'Escape') setEditingPolicy(null)
                      }}
                      autoFocus
                      className="w-20 bg-slate-800 border border-brand-accent/50 rounded px-2 py-0.5 text-sm text-slate-200 focus:outline-none"
                    />
                  ) : (
                    <span className="text-slate-300 font-mono">{policy.resolution_hours}h</span>
                  )}
                </td>
                <td className="py-2.5 text-right">
                  {editingPolicy === policy.priority ? (
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handlePolicySave(policy.priority)}
                        disabled={updatePolicy.isPending}
                        className="text-xs text-brand-accent hover:text-white transition-colors disabled:opacity-50"
                      >
                        {t('settings.sla.policies.save')}
                      </button>
                      <button
                        onClick={() => setEditingPolicy(null)}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {t('settings.sla.policies.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingPolicy(policy.priority)
                        setEditingHours(String(policy.resolution_hours))
                      }}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {t('settings.sla.policies.edit')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-brand-border/30 pt-8">
        <HolidaysSection holidays={data?.holidays ?? []} />
      </div>
    </section>
  )
}

function HolidaysSection({ holidays }: { holidays: any[] }) {
  const { t } = useTranslation()
  const deleteHoliday = useDeleteHoliday()
  const [showModal, setShowModal] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-300">{t('settings.sla.holidays.title')}</h3>
        <button
          onClick={() => setShowModal(true)}
          className="text-xs font-semibold px-3 py-1 rounded bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors"
        >
          {t('settings.sla.holidays.new')}
        </button>
      </div>

      {!holidays.length ? (
        <p className="text-xs text-slate-500 italic">{t('settings.sla.holidays.empty')}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
              <th className="pb-2 font-medium">{t('settings.sla.holidays.colDate')}</th>
              <th className="pb-2 font-medium">{t('settings.sla.holidays.colDescription')}</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {holidays.map((h) => (
              <tr key={h.id} className="border-b border-slate-800">
                <td className="py-2.5 text-slate-200 font-mono text-xs">
                  {new Date(h.date + 'T00:00:00').toLocaleDateString()}
                </td>
                <td className="py-2.5 text-slate-400 text-xs">{h.description}</td>
                <td className="py-2.5 text-right">
                  <button
                    disabled={deleteHoliday.isPending}
                    onClick={() => deleteHoliday.mutate(h.id)}
                    className="text-xs text-red-500/70 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {t('settings.sla.holidays.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && <CreateHolidayModal onClose={() => setShowModal(false)} />}
    </div>
  )
}

function CreateHolidayModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const { mutate, isPending, error } = useCreateHoliday()
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate({ date, description }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-slate-200 mb-4">
          {t('settings.sla.holidays.modalTitle')}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('settings.sla.holidays.fieldDate')}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('settings.sla.holidays.fieldDescription')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-accent"
              placeholder="Ex: Natal"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">
              {(error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
                t('settings.users.errorGeneric')}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              {t('settings.sources.cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-3 py-1.5 text-sm rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? t('settings.sla.holidays.creating') : t('settings.sla.holidays.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface ApiKeyAlertProps {
  source: SourceCreated
  onClose: () => void
}

function ApiKeyAlert({ source, onClose }: ApiKeyAlertProps) {
  const { t } = useTranslation()
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)

  const handleCopyKey = () => {
    navigator.clipboard.writeText(source.api_key)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const handleCopySecret = () => {
    navigator.clipboard.writeText(source.webhook_secret)
    setCopiedSecret(true)
    setTimeout(() => setCopiedSecret(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-amber-500/50 rounded-lg w-full max-w-lg p-6">
        <h3 className="text-base font-semibold text-amber-400 mb-1">
          {t('settings.sources.apiKeyTitle')}
        </h3>
        <p className="text-xs text-slate-400 mb-4">{t('settings.sources.apiKeyWarning')}</p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5 px-1">
              API KEY
            </label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-800 rounded p-3 font-mono text-xs text-slate-200 break-all border border-slate-700">
                {source.api_key}
              </div>
              <button
                onClick={handleCopyKey}
                className="shrink-0 px-3 py-1.5 text-xs rounded border border-slate-700 text-slate-400 hover:text-white hover:bg-white/5 transition-all self-start"
              >
                {copiedKey ? t('settings.sources.copied') : t('settings.sources.copy')}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5 px-1">
              {t('settings.sources.webhookSecretLabel')}
            </label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-800 rounded p-3 font-mono text-xs text-slate-200 break-all border border-slate-700">
                {source.webhook_secret}
              </div>
              <button
                onClick={handleCopySecret}
                className="shrink-0 px-3 py-1.5 text-xs rounded border border-slate-700 text-slate-400 hover:text-white hover:bg-white/5 transition-all self-start"
              >
                {copiedSecret ? t('settings.sources.copied') : t('settings.sources.copy')}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-semibold rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 transition-all shadow-lg shadow-brand-accent/20"
          >
            {t('settings.sources.apiKeyConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
