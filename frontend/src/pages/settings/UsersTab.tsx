import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMe } from '../../hooks/useAuth'
import { useAllUsers, useCreateUser, useUpdateUser } from '../../hooks/useUsers'
import { inputCls, Modal, Field, RoleSelect, FormError, ModalActions } from './shared'
import type { User } from '../../hooks/useAuth'

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
        {user.role === 'agent' && !isSelf ? (
          <button
            onClick={() => updateUser.mutate({ is_senior: !user.is_senior })}
            disabled={updateUser.isPending}
            className={`text-xs underline decoration-dotted transition-colors disabled:opacity-50 ${
              user.is_senior ? 'text-amber-400 hover:text-amber-200' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {user.is_senior ? t('settings.users.senior') : t('settings.users.regular')}
          </button>
        ) : (
          <span className="text-xs text-slate-600">—</span>
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
          <button onClick={onEdit} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
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
    mutate({ name, email, role, ...(password ? { password } : {}) }, { onSuccess: onClose })
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

export function UsersTab() {
  const { t } = useTranslation()
  const { data: me } = useMe()
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
              <th className="pb-2 font-medium">{t('settings.users.colSenior')}</th>
              <th className="pb-2 font-medium">{t('settings.users.colStatus')}</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                isSelf={u.id === me?.id}
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
