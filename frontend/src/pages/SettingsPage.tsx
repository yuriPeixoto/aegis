import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMe } from '../hooks/useAuth'
import { useSources, useCreateSource, type SourceCreated } from '../hooks/useSources'
import { useAllUsers, useCreateUser, useUpdateUser } from '../hooks/useUsers'
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

interface ApiKeyAlertProps {
  source: SourceCreated
  onClose: () => void
}

function ApiKeyAlert({ source, onClose }: ApiKeyAlertProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(source.api_key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-amber-500/50 rounded-lg w-full max-w-lg p-6">
        <h3 className="text-base font-semibold text-amber-400 mb-1">
          {t('settings.sources.apiKeyTitle')}
        </h3>
        <p className="text-xs text-slate-400 mb-4">{t('settings.sources.apiKeyWarning')}</p>

        <div className="bg-slate-800 rounded p-3 font-mono text-sm text-slate-200 break-all mb-4">
          {source.api_key}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 text-sm rounded-md border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            {copied ? t('settings.sources.copied') : t('settings.sources.copy')}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors"
          >
            {t('settings.sources.apiKeyConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
