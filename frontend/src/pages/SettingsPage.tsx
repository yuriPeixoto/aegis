import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Users, Plug, Clock } from 'lucide-react'
import { useMe } from '../hooks/useAuth'
import { useSources, useCreateSource, useUpdateSource, useRegenerateSourceKey, type SourceCreated, type Source } from '../hooks/useSources'
import { useAllUsers, useCreateUser, useUpdateUser } from '../hooks/useUsers'
import { useSlaSettings, useUpdateBusinessHours, useUpdateSlaPolicy, useCreateHoliday, useDeleteHoliday } from '../hooks/useSlaSettings'
import type { User } from '../hooks/useAuth'

const TABS = [
  { id: 'users',   label: 'settings.nav.users',   icon: Users },
  { id: 'sources', label: 'settings.nav.sources', icon: Plug  },
  { id: 'sla',     label: 'settings.nav.sla',     icon: Clock },
]

export function SettingsPage() {
  const { t } = useTranslation()
  const { data: user } = useMe()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'users'

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-slate-500">{t('settings.forbidden')}</p>
      </div>
    )
  }

  return (
    <div className="flex gap-8 h-full">
      {/* Left nav */}
      <nav className="w-44 shrink-0 pt-1">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3 px-2">
          {t('settings.nav.title')}
        </p>
        <ul className="space-y-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                onClick={() => setSearchParams({ tab: id })}
                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors text-left ${
                  activeTab === id
                    ? 'bg-white/8 text-slate-100 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {t(label)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Divider */}
      <div className="w-px bg-brand-border shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0 pt-1">
        {activeTab === 'users'   && <UsersSection   currentUserId={user.id} />}
        {activeTab === 'sources' && <SourcesSection />}
        {activeTab === 'sla'     && <SlaSection />}
      </div>
    </div>
  )
}

// ── Users ─────────────────────────────────────────────────────────────────────

interface UsersSectionProps {
  currentUserId: number
}

function UsersSection({ currentUserId }: UsersSectionProps) {
  const { t } = useTranslation()
  const { data: users, isLoading } = useAllUsers()
  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-slate-200">{t('settings.users.title')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('settings.users.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
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
              <UserRow
                key={u.id}
                user={u}
                isSelf={u.id === currentUserId}
                onEdit={() => setEditingUser(u)}
              />
            ))}
          </tbody>
        </table>
      )}

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />}
    </section>
  )
}

interface UserRowProps {
  user: User
  isSelf: boolean
  onEdit: () => void
}

function UserRow({ user, isSelf, onEdit }: UserRowProps) {
  const { t } = useTranslation()
  const updateUser = useUpdateUser(user.id)

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
            onClick={() => updateUser.mutate({ role: user.role === 'admin' ? 'agent' : 'admin' })}
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
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onEdit}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {t('settings.users.edit')}
          </button>
          {!isSelf && (
            <button
              onClick={() => updateUser.mutate({ is_active: !user.is_active })}
              disabled={updateUser.isPending}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
            >
              {user.is_active ? t('settings.users.deactivate') : t('settings.users.activate')}
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
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
    <Modal title={t('settings.users.modalTitle')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t('settings.users.fieldName')}>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className={inputCls} />
        </Field>
        <Field label={t('settings.users.fieldEmail')}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
        </Field>
        <Field label={t('settings.users.fieldPassword')}>
          <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="off" className={`${inputCls} font-mono`} placeholder="••••••••" />
          <p className="text-xs text-slate-500 mt-1">{t('settings.users.passwordHint')}</p>
        </Field>
        <Field label={t('settings.users.fieldRole')}>
          <RoleSelect value={role} onChange={setRole} />
        </Field>
        <FormError error={error} fallback={t('settings.users.errorGeneric')} />
        <ModalActions onClose={onClose} isPending={isPending} submitLabel={t('settings.users.create')} pendingLabel={t('settings.users.creating')} />
      </form>
    </Modal>
  )
}

function EditUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { t } = useTranslation()
  const { mutate, isPending, error } = useUpdateUser(user.id)
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(user.role)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate(
      { name, email, role, ...(password ? { password } : {}) },
      { onSuccess: onClose }
    )
  }

  return (
    <Modal title={t('settings.users.editTitle')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t('settings.users.fieldName')}>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className={inputCls} />
        </Field>
        <Field label={t('settings.users.fieldEmail')}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
        </Field>
        <Field label={t('settings.users.fieldPasswordOptional')}>
          <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" className={`${inputCls} font-mono`} placeholder={t('settings.users.passwordBlankHint')} />
        </Field>
        <Field label={t('settings.users.fieldRole')}>
          <RoleSelect value={role} onChange={setRole} />
        </Field>
        <FormError error={error} fallback={t('settings.users.errorGeneric')} />
        <ModalActions onClose={onClose} isPending={isPending} submitLabel={t('settings.users.save')} pendingLabel={t('settings.users.saving')} />
      </form>
    </Modal>
  )
}

// ── Sources ───────────────────────────────────────────────────────────────────

function SourcesSection() {
  const { t } = useTranslation()
  const { data: sources, isLoading } = useSources()
  const [showCreate, setShowCreate] = useState(false)
  const [editingSource, setEditingSource] = useState<Source | null>(null)
  const [revealedKeys, setRevealedKeys] = useState<{ api_key: string; webhook_secret: string } | null>(null)

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-slate-200">{t('settings.sources.title')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('settings.sources.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
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
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                onEdit={() => setEditingSource(source)}
                onKeysRevealed={(keys) => setRevealedKeys(keys)}
              />
            ))}
          </tbody>
        </table>
      )}

      {showCreate && (
        <CreateSourceModal
          onClose={() => setShowCreate(false)}
          onCreated={(s) => {
            setShowCreate(false)
            setRevealedKeys({ api_key: s.api_key, webhook_secret: s.webhook_secret })
          }}
        />
      )}

      {editingSource && (
        <EditSourceModal
          source={editingSource}
          onClose={() => setEditingSource(null)}
          onKeysRegenerated={(keys) => {
            setEditingSource(null)
            setRevealedKeys(keys)
          }}
        />
      )}

      {revealedKeys && (
        <ApiKeyAlert
          api_key={revealedKeys.api_key}
          webhook_secret={revealedKeys.webhook_secret}
          onClose={() => setRevealedKeys(null)}
        />
      )}
    </section>
  )
}

interface SourceRowProps {
  source: Source
  onEdit: () => void
  onKeysRevealed: (keys: { api_key: string; webhook_secret: string }) => void
}

function SourceRow({ source, onEdit }: SourceRowProps) {
  const { t } = useTranslation()
  const updateSource = useUpdateSource(source.id)

  return (
    <tr className="border-b border-slate-800">
      <td className="py-2.5 text-slate-200">
        {source.name}
        {!source.is_active && (
          <span className="ml-2 text-[10px] text-slate-500 border border-slate-700 rounded px-1 py-0.5">
            inativa
          </span>
        )}
      </td>
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
      <td className="py-2.5 text-right">
        <div className="flex items-center justify-end gap-3">
          <button onClick={onEdit} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            {t('settings.users.edit')}
          </button>
          <button
            onClick={() => updateSource.mutate({ is_active: !source.is_active })}
            disabled={updateSource.isPending}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
          >
            {source.is_active ? t('settings.sources.deactivate') : t('settings.sources.activate')}
          </button>
        </div>
      </td>
    </tr>
  )
}

function CreateSourceModal({ onClose, onCreated }: { onClose: () => void; onCreated: (s: SourceCreated) => void }) {
  const { t } = useTranslation()
  const { mutate, isPending, error } = useCreateSource()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  const handleNameChange = (value: string) => {
    setName(value)
    setSlug(value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
  }

  return (
    <Modal title={t('settings.sources.modalTitle')} onClose={onClose}>
      <form
        onSubmit={(e) => { e.preventDefault(); mutate({ name, slug }, { onSuccess: onCreated }) }}
        className="space-y-4"
      >
        <Field label={t('settings.sources.fieldName')}>
          <input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)} required minLength={2} className={inputCls} />
        </Field>
        <Field label={t('settings.sources.fieldSlug')}>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} required minLength={2} pattern="^[a-z0-9-]+$" className={`${inputCls} font-mono`} />
          <p className="text-xs text-slate-600 mt-1">{t('settings.sources.slugHint')}</p>
        </Field>
        <FormError error={error} fallback={t('settings.sources.errorGeneric')} />
        <ModalActions onClose={onClose} isPending={isPending} submitLabel={t('settings.sources.create')} pendingLabel={t('settings.sources.creating')} />
      </form>
    </Modal>
  )
}

function EditSourceModal({
  source,
  onClose,
  onKeysRegenerated,
}: {
  source: Source
  onClose: () => void
  onKeysRegenerated: (keys: { api_key: string; webhook_secret: string }) => void
}) {
  const { t } = useTranslation()
  const updateSource = useUpdateSource(source.id)
  const regenerateKey = useRegenerateSourceKey(source.id)
  const [name, setName] = useState(source.name)
  const [confirmRegen, setConfirmRegen] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateSource.mutate({ name }, { onSuccess: onClose })
  }

  const handleRegen = () => {
    regenerateKey.mutate(undefined, {
      onSuccess: (data) => onKeysRegenerated(data),
    })
  }

  return (
    <Modal title={t('settings.sources.editTitle')} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <Field label={t('settings.sources.fieldName')}>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className={inputCls} />
        </Field>
        <Field label={t('settings.sources.fieldSlug')}>
          <div className={`${inputCls} text-slate-500 font-mono cursor-not-allowed`}>{source.slug}</div>
          <p className="text-xs text-slate-600 mt-1">{t('settings.sources.slugImmutable')}</p>
        </Field>

        {/* Regenerate key area */}
        <div className="border border-amber-500/20 rounded-lg p-4 bg-amber-950/10 space-y-2">
          <p className="text-xs font-semibold text-amber-400">{t('settings.sources.regenTitle')}</p>
          <p className="text-xs text-slate-400">{t('settings.sources.regenWarning')}</p>
          {!confirmRegen ? (
            <button
              type="button"
              onClick={() => setConfirmRegen(true)}
              className="text-xs text-amber-400 hover:text-amber-300 underline transition-colors"
            >
              {t('settings.sources.regenButton')}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{t('settings.sources.regenConfirm')}</span>
              <button
                type="button"
                onClick={handleRegen}
                disabled={regenerateKey.isPending}
                className="text-xs px-2 py-1 rounded bg-amber-500 text-black font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
              >
                {regenerateKey.isPending ? t('settings.sources.regenPending') : t('settings.sources.regenConfirmButton')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmRegen(false)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {t('settings.sources.cancel')}
              </button>
            </div>
          )}
        </div>

        <ModalActions onClose={onClose} isPending={updateSource.isPending} submitLabel={t('settings.users.save')} pendingLabel={t('settings.users.saving')} />
      </form>
    </Modal>
  )
}

// ── SLA ───────────────────────────────────────────────────────────────────────

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

  const [workDays, setWorkDays] = useState<number[]>([])
  const [workStart, setWorkStart] = useState('')
  const [workEnd, setWorkEnd] = useState('')
  const [lunchStart, setLunchStart] = useState('')
  const [lunchEnd, setLunchEnd] = useState('')
  const [timezone, setTimezone] = useState('')
  const [bhDirty, setBhDirty] = useState(false)
  const [bhSaved, setBhSaved] = useState(false)

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
      { work_days: workDays, work_start: workStart, work_end: workEnd, lunch_start: lunchStart || null, lunch_end: lunchEnd || null, timezone },
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
    updatePolicy.mutate({ priority, resolution_hours: hours }, { onSuccess: () => setEditingPolicy(null) })
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
      <div>
        <h2 className="text-base font-semibold text-slate-200">{t('settings.sla.title')}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{t('settings.sla.subtitle')}</p>
      </div>

      {/* Business Hours */}
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-3">{t('settings.sla.businessHours.title')}</h3>
        <div className="space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('settings.sla.businessHours.workStart')}</label>
              <input type="time" value={workStart} onChange={(e) => { setWorkStart(e.target.value); setBhDirty(true) }} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('settings.sla.businessHours.workEnd')}</label>
              <input type="time" value={workEnd} onChange={(e) => { setWorkEnd(e.target.value); setBhDirty(true) }} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('settings.sla.businessHours.lunchStart')}</label>
              <input type="time" value={lunchStart} onChange={(e) => { setLunchStart(e.target.value); setBhDirty(true) }} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('settings.sla.businessHours.lunchEnd')}</label>
              <input type="time" value={lunchEnd} onChange={(e) => { setLunchEnd(e.target.value); setBhDirty(true) }} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">{t('settings.sla.businessHours.timezone')}</label>
            <input type="text" value={timezone} onChange={(e) => { setTimezone(e.target.value); setBhDirty(true) }} placeholder="America/Sao_Paulo" className={`${inputCls} font-mono`} />
            <p className="text-xs text-slate-600 mt-1">{t('settings.sla.businessHours.timezoneHint')}</p>
          </div>

          <button
            onClick={handleBhSave}
            disabled={!bhDirty || updateBH.isPending}
            className="px-3 py-1.5 text-sm rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 disabled:opacity-40 transition-colors"
          >
            {updateBH.isPending ? t('settings.sla.businessHours.saving') : bhSaved ? t('settings.sla.businessHours.saved') : t('settings.sla.businessHours.save')}
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
                <td className="py-2.5 text-slate-200">{t(`priority.${policy.priority.toUpperCase()}`)}</td>
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
                      <button onClick={() => handlePolicySave(policy.priority)} disabled={updatePolicy.isPending} className="text-xs text-brand-accent hover:text-white transition-colors disabled:opacity-50">
                        {t('settings.sla.policies.save')}
                      </button>
                      <button onClick={() => setEditingPolicy(null)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                        {t('settings.sla.policies.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingPolicy(policy.priority); setEditingHours(String(policy.resolution_hours)) }}
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

  return (
    <Modal title={t('settings.sla.holidays.modalTitle')} onClose={onClose}>
      <form
        onSubmit={(e) => { e.preventDefault(); mutate({ date, description }, { onSuccess: onClose }) }}
        className="space-y-4"
      >
        <Field label={t('settings.sla.holidays.fieldDate')}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputCls} />
        </Field>
        <Field label={t('settings.sla.holidays.fieldDescription')}>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required className={inputCls} placeholder="Ex: Natal" />
        </Field>
        <FormError error={error} fallback={t('settings.users.errorGeneric')} />
        <ModalActions onClose={onClose} isPending={isPending} submitLabel={t('settings.sla.holidays.create')} pendingLabel={t('settings.sla.holidays.creating')} />
      </form>
    </Modal>
  )
}

// ── ApiKeyAlert ───────────────────────────────────────────────────────────────

function ApiKeyAlert({ api_key, webhook_secret, onClose }: { api_key: string; webhook_secret: string; onClose: () => void }) {
  const { t } = useTranslation()
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)

  const copy = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-amber-500/50 rounded-lg w-full max-w-lg p-6">
        <h3 className="text-base font-semibold text-amber-400 mb-1">{t('settings.sources.apiKeyTitle')}</h3>
        <p className="text-xs text-slate-400 mb-4">{t('settings.sources.apiKeyWarning')}</p>

        <div className="space-y-4 mb-6">
          {[
            { label: 'API KEY', value: api_key, copied: copiedKey, setCopied: setCopiedKey },
            { label: t('settings.sources.webhookSecretLabel'), value: webhook_secret, copied: copiedSecret, setCopied: setCopiedSecret },
          ].map(({ label, value, copied, setCopied }) => (
            <div key={label}>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5 px-1">{label}</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-800 rounded p-3 font-mono text-xs text-slate-200 break-all border border-slate-700">{value}</div>
                <button
                  onClick={() => copy(value, setCopied)}
                  className="shrink-0 px-3 py-1.5 text-xs rounded border border-slate-700 text-slate-400 hover:text-white hover:bg-white/5 transition-all self-start"
                >
                  {copied ? t('settings.sources.copied') : t('settings.sources.copy')}
                </button>
              </div>
            </div>
          ))}
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

// ── Shared UI primitives ──────────────────────────────────────────────────────

const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-accent'

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-slate-200 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

function RoleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation()
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      <option value="agent">{t('settings.users.role.agent')}</option>
      <option value="admin">{t('settings.users.role.admin')}</option>
      <option value="viewer">{t('settings.users.role.viewer')}</option>
    </select>
  )
}

function FormError({ error, fallback }: { error: unknown; fallback: string }) {
  if (!error) return null
  const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  return <p className="text-xs text-red-400">{detail ?? fallback}</p>
}

function ModalActions({
  onClose,
  isPending,
  submitLabel,
  pendingLabel,
}: {
  onClose: () => void
  isPending: boolean
  submitLabel: string
  pendingLabel: string
}) {
  const { t } = useTranslation()
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
        {t('settings.sources.cancel')}
      </button>
      <button type="submit" disabled={isPending} className="px-3 py-1.5 text-sm rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 disabled:opacity-50 transition-colors">
        {isPending ? pendingLabel : submitLabel}
      </button>
    </div>
  )
}
