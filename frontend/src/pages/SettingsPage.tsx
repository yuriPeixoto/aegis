import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Users, Plug, Clock, Trash2, MessageSquare, Edit, Tag as TagIcon, AlertTriangle, Play, Plus, X } from 'lucide-react'
import { useMe } from '../hooks/useAuth'
import { useSources, useCreateSource, useUpdateSource, useRegenerateSourceKey, type SourceCreated, type Source } from '../hooks/useSources'
import { useAllUsers, useCreateUser, useUpdateUser } from '../hooks/useUsers'
import { useSlaSettings, useUpdateBusinessHours, useUpdateSlaPolicy, useCreateHoliday, useDeleteHoliday } from '../hooks/useSlaSettings'
import { useAutoCloseSettings, useUpdateAutoCloseSettings } from '../hooks/useAutoCloseSettings'
import { useCannedResponses, useCreateCannedResponse, useUpdateCannedResponse, useDeleteCannedResponse } from '../hooks/useCannedResponses'
import { useTags, type TagCreate, type TagUpdate } from '../hooks/useTags'
import { useEscalationRules, useCreateEscalationRule, useUpdateEscalationRule, useDeleteEscalationRule, useRunEscalation, type EscalationRule, type EscalationRuleCreate } from '../hooks/useEscalation'
import type { User } from '../hooks/useAuth'
import type { CannedResponse, CannedResponseActions } from '../hooks/useCannedResponses'
import type { Tag } from '../types/ticket'

const TABS = [
  { id: 'users',      label: 'settings.nav.users',            icon: Users },
  { id: 'sources',    label: 'settings.nav.sources',          icon: Plug  },
  { id: 'tags',       label: 'settings.nav.tags',             icon: TagIcon },
  { id: 'sla',        label: 'settings.nav.sla',              icon: Clock },
  { id: 'autoclose',  label: 'settings.nav.autoClose',        icon: Trash2 },
  { id: 'canned',     label: 'settings.nav.cannedResponses',  icon: MessageSquare },
  { id: 'escalation', label: 'settings.nav.escalation',       icon: AlertTriangle },
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
        {activeTab === 'tags'    && <TagsSection />}
        {activeTab === 'sla'     && <SlaSection />}
        {activeTab === 'autoclose' && <AutoCloseSection />}
        {activeTab === 'canned'     && <CannedResponsesSection />}
        {activeTab === 'escalation' && <EscalationSection />}
      </div>
    </div>
  )
}

function CannedResponsesSection() {
  const { t } = useTranslation()
  const { data: responses, isLoading } = useCannedResponses()
  const createResponse = useCreateCannedResponse()
  const updateResponse = useUpdateCannedResponse()
  const deleteResponse = useDeleteCannedResponse()
  const { data: usersData } = useAllUsers()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CannedResponse | null>(null)
  const [form, setForm] = useState<Partial<CannedResponse>>({
    title: '',
    body: '',
    actions: {}
  })

  const handleEdit = (res: CannedResponse) => {
    setEditing(res)
    setForm({
      title: res.title,
      body: res.body,
      actions: res.actions || {}
    })
    setModalOpen(true)
  }

  const handleSave = () => {
    if (editing) {
      updateResponse.mutate({ id: editing.id, ...form }, {
        onSuccess: () => {
          setModalOpen(false)
          toast.success('Resposta pronta atualizada com sucesso!')
        },
        onError: () => toast.error('Erro ao atualizar resposta pronta.')
      })
    } else {
      createResponse.mutate(form as any, {
        onSuccess: () => {
          setModalOpen(false)
          toast.success('Resposta pronta criada com sucesso!')
        },
        onError: () => toast.error('Erro ao criar resposta pronta.')
      })
    }
  }

  const handleDelete = (id: number) => {
    if (confirm(t('common.confirmDelete'))) {
      deleteResponse.mutate(id, {
        onSuccess: () => toast.success('Resposta pronta excluída.'),
        onError: () => toast.error('Erro ao excluir resposta pronta.')
      })
    }
  }

  if (isLoading) return <p className="text-sm text-slate-500">{t('inbox.loading')}</p>

  const agents = usersData?.filter(u => u.role !== 'viewer') || []

  return (
    <section className="pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100 leading-tight">
            {t('settings.cannedResponses.title')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('settings.cannedResponses.subtitle')}
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null)
            setForm({ title: '', body: '', actions: {} })
            setModalOpen(true)
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-brand-purple hover:bg-brand-purple-hover text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-brand-purple/20"
        >
          <MessageSquare className="w-4 h-4" />
          {t('settings.cannedResponses.new')}
        </button>
      </div>

      <div className="bg-slate-800/40 border border-brand-border rounded-xl overflow-hidden shadow-xl shadow-black/20">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-brand-border bg-white/2">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t('settings.cannedResponses.colTitle')}
              </th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t('settings.cannedResponses.colActions')}
              </th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {responses?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-500">
                  {t('settings.cannedResponses.empty')}
                </td>
              </tr>
            )}
            {responses?.map((res) => (
              <tr key={res.id} className="hover:bg-white/2 transition-colors group">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-slate-200 block truncate max-w-xs" title={res.title}>
                    {res.title}
                  </span>
                  <span className="text-xs text-slate-500 block truncate max-w-xs mt-0.5">
                    {res.body.substring(0, 60)}...
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {res.actions?.status && (
                      <span className="px-1.5 py-0.5 bg-slate-700 border border-slate-600 rounded text-[10px] font-medium text-slate-300">
                        Status: {t('status.' + res.actions.status.toUpperCase())}
                      </span>
                    )}
                    {res.actions?.priority && (
                      <span className="px-1.5 py-0.5 bg-slate-700 border border-slate-600 rounded text-[10px] font-medium text-slate-300">
                        Prio: {t('priority.' + res.actions.priority.toUpperCase())}
                      </span>
                    )}
                    {res.actions?.assigned_to_user_id && (
                      <span className="px-1.5 py-0.5 bg-slate-700 border border-slate-600 rounded text-[10px] font-medium text-slate-300">
                        Assign: {agents.find(a => a.id === res.actions?.assigned_to_user_id)?.name}
                      </span>
                    )}
                    {!res.actions?.status && !res.actions?.priority && !res.actions?.assigned_to_user_id && (
                      <span className="text-[10px] text-slate-500">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(res)}
                      className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-md"
                      title={t('settings.cannedResponses.edit')}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(res.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-md"
                      title={t('settings.cannedResponses.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-brand-border rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-brand-border shrink-0">
              <h3 className="text-lg font-bold text-slate-100">
                {editing ? t('settings.cannedResponses.modal.editTitle') : t('settings.cannedResponses.modal.title')}
              </h3>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t('settings.cannedResponses.modal.fieldTitle')}
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={t('settings.cannedResponses.modal.titlePlaceholder')}
                  className="w-full bg-slate-800 border border-brand-border rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-purple/40 focus:border-brand-purple/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t('settings.cannedResponses.modal.fieldBody')}
                </label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder={t('settings.cannedResponses.modal.bodyPlaceholder')}
                  rows={6}
                  className="w-full bg-slate-800 border border-brand-border rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-purple/40 focus:border-brand-purple/50 transition-all resize-none"
                />
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="text-[10px] text-slate-500 font-medium">{t('settings.cannedResponses.modal.variables')}</span>
                  {['{{ticket.requester.name}}', '{{ticket.id}}', '{{user.name}}'].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm({ ...form, body: (form.body || '') + v })}
                      className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-brand-purple hover:bg-brand-purple/10 transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    {t('settings.cannedResponses.modal.fieldStatus')}
                  </label>
                  <select
                    value={form.actions?.status || ''}
                    onChange={(e) => setForm({ ...form, actions: { ...form.actions, status: e.target.value || undefined } })}
                    className="w-full bg-slate-800 border border-brand-border rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-purple/40"
                  >
                    <option value="">{t('settings.cannedResponses.modal.noAction')}</option>
                    {['open', 'in_progress', 'waiting_client', 'pending_closure', 'resolved', 'closed', 'cancelled'].map(s => (
                      <option key={s} value={s}>{t('status.' + s.toUpperCase())}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    {t('settings.cannedResponses.modal.fieldPriority')}
                  </label>
                  <select
                    value={form.actions?.priority || ''}
                    onChange={(e) => setForm({ ...form, actions: { ...form.actions, priority: e.target.value || undefined } })}
                    className="w-full bg-slate-800 border border-brand-border rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-purple/40"
                  >
                    <option value="">{t('settings.cannedResponses.modal.noAction')}</option>
                    {['low', 'medium', 'high', 'urgent'].map(p => (
                      <option key={p} value={p}>{t('priority.' + p.toUpperCase())}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    {t('settings.cannedResponses.modal.fieldAssignee')}
                  </label>
                  <select
                    value={form.actions?.assigned_to_user_id || ''}
                    onChange={(e) => setForm({ ...form, actions: { ...form.actions, assigned_to_user_id: e.target.value ? parseInt(e.target.value) : undefined } })}
                    className="w-full bg-slate-800 border border-brand-border rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-purple/40"
                  >
                    <option value="">{t('settings.cannedResponses.modal.noAction')}</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-brand-border flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors"
              >
                {t('settings.cannedResponses.modal.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={!form.title || !form.body}
                className="px-6 py-2 bg-brand-purple hover:bg-brand-purple-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-brand-purple/20"
              >
                {t('settings.cannedResponses.modal.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function AutoCloseSection() {
  const { t } = useTranslation()
  const { data: settings, isLoading } = useAutoCloseSettings()
  const updateSettings = useUpdateAutoCloseSettings()
  const [form, setForm] = useState({
    enabled: false,
    wait_days: 5,
    warning_days: 3,
    close_message: '',
    warning_message: '',
  })
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setForm({
        enabled: settings.enabled,
        wait_days: settings.wait_days,
        warning_days: settings.warning_days,
        close_message: settings.close_message,
        warning_message: settings.warning_message,
      })
    }
  }, [settings])

  if (isLoading || !settings) return <p className="text-sm text-slate-500">{t('inbox.loading')}</p>

  const handleSave = () => {
    updateSettings.mutate(form, {
      onSuccess: () => {
        setShowSaved(true)
        setTimeout(() => setShowSaved(false), 3000)
      },
    })
  }

  return (
    <section className="max-w-2xl pb-10">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-slate-200">{t('settings.sla.autoClose.title')}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{t('settings.sla.autoClose.subtitle')}</p>
      </div>

      <div className="space-y-6">
        <label className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/8 transition-colors">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-brand-accent focus:ring-brand-accent focus:ring-offset-slate-900"
          />
          <div>
            <p className="text-sm font-medium text-slate-200">{t('settings.sla.autoClose.enabled')}</p>
          </div>
        </label>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">{t('settings.sla.autoClose.waitDays')}</label>
            <input
              type="number"
              value={form.wait_days}
              onChange={(e) => setForm({ ...form, wait_days: parseInt(e.target.value) || 0 })}
              className={`${inputCls} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            />
            <p className="text-[10px] text-slate-500">{t('settings.sla.autoClose.waitDaysHint')}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">{t('settings.sla.autoClose.warningDays')}</label>
            <input
              type="number"
              value={form.warning_days}
              onChange={(e) => setForm({ ...form, warning_days: parseInt(e.target.value) || 0 })}
              className={`${inputCls} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            />
            <p className="text-[10px] text-slate-500">{t('settings.sla.autoClose.warningDaysHint')}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">{t('settings.sla.autoClose.warningMessage')}</label>
          <textarea
            value={form.warning_message}
            onChange={(e) => setForm({ ...form, warning_message: e.target.value })}
            rows={3}
            className={`${inputCls} resize-none`}
          />
          <p className="text-[10px] text-slate-500">{t('settings.sla.autoClose.warningMessageHint')}</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">{t('settings.sla.autoClose.closeMessage')}</label>
          <textarea
            value={form.close_message}
            onChange={(e) => setForm({ ...form, close_message: e.target.value })}
            rows={3}
            className={`${inputCls} resize-none`}
          />
          <p className="text-[10px] text-slate-500">{t('settings.sla.autoClose.closeMessageHint')}</p>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="px-4 py-2 bg-brand-accent text-white text-sm font-medium rounded-md hover:bg-brand-accent/90 disabled:opacity-50 transition-colors"
          >
            {updateSettings.isPending ? t('settings.sla.autoClose.saving') : t('settings.sla.autoClose.save')}
          </button>
          {showSaved && <span className="text-sm text-emerald-400 animate-in fade-in slide-in-from-left-2">{t('settings.sla.autoClose.saved')}</span>}
        </div>
      </div>
    </section>
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
  const [webhookUrl, setWebhookUrl] = useState(source.webhook_url ?? '')
  const [confirmRegen, setConfirmRegen] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateSource.mutate({ name, webhook_url: webhookUrl }, { onSuccess: onClose })
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
        <Field label={t('settings.sources.fieldWebhookUrl')}>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className={inputCls}
            placeholder="https://..."
          />
          <p className="text-xs text-slate-600 mt-1">{t('settings.sources.webhookUrlHint')}</p>
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
                      className="w-20 bg-slate-800 border border-brand-accent/50 rounded px-2 py-0.5 text-sm text-slate-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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

function TagsSection() {
  const { t } = useTranslation()
  const { tags, isLoading, createTag, updateTag, deleteTag } = useTags()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Tag | null>(null)
  const [form, setForm] = useState<TagCreate>({
    name: '',
    color: '#6B7280',
    description: ''
  })

  const handleEdit = (tag: Tag) => {
    setEditing(tag)
    setForm({
      name: tag.name,
      color: tag.color,
      description: tag.description || ''
    })
    setModalOpen(true)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      updateTag.mutate({ id: editing.id, tagIn: form }, {
        onSuccess: () => {
          setModalOpen(false)
          toast.success(t('settings.tags.saved'))
        },
        onError: () => toast.error(t('settings.tags.error'))
      })
    } else {
      createTag.mutate(form, {
        onSuccess: () => {
          setModalOpen(false)
          toast.success(t('settings.tags.created'))
        },
        onError: () => toast.error(t('settings.tags.error'))
      })
    }
  }

  const handleDelete = (id: number) => {
    if (confirm(t('common.confirmDelete', 'Tem certeza?'))) {
      deleteTag.mutate(id, {
        onSuccess: () => toast.success(t('settings.tags.deleted')),
        onError: () => toast.error(t('settings.tags.errorDelete'))
      })
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">{t('settings.tags.title')}</h2>
          <p className="text-sm text-slate-400 mt-1">{t('settings.tags.subtitle')}</p>
        </div>
        <button
          onClick={() => {
            setEditing(null)
            setForm({ name: '', color: '#6B7280', description: '' })
            setModalOpen(true)
          }}
          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors"
        >
          {t('settings.tags.new')}
        </button>
      </header>

      <div className="bg-brand-surface border border-brand-border rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-brand-border bg-white/2">
            <tr>
              <th className="px-4 py-3">{t('settings.tags.colName')}</th>
              <th className="px-4 py-3">{t('settings.tags.colDescription')}</th>
              <th className="px-4 py-3 w-20 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {isLoading ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500 font-mono animate-pulse">{t('common.processing')}</td></tr>
            ) : tags.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500 italic">{t('settings.tags.empty')}</td></tr>
            ) : (
              tags.map((tag) => (
                <tr key={tag.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                      <span className="font-medium text-slate-200">{tag.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                    {tag.description || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(tag)} className="p-1 text-slate-500 hover:text-slate-200 transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(tag.id)} className="p-1 text-slate-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-brand-surface border border-brand-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <header className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editing ? t('settings.tags.editTitle') : t('settings.tags.modalTitle')}
              </h3>
            </header>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings.tags.fieldName')}</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-black/20 border border-brand-border rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-accent transition-colors"
                  placeholder="Ex: Urgente, Bug, etc"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings.tags.fieldColor')}</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-9 w-12 bg-black/20 border border-brand-border rounded-md p-1 cursor-pointer"
                  />
                  <input
                    required
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="flex-1 bg-black/20 border border-brand-border rounded-md px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-brand-accent transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings.tags.fieldDescription')}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-black/20 border border-brand-border rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-accent transition-colors h-20 resize-none"
                />
              </div>
              <ModalActions
                onClose={() => setModalOpen(false)}
                isPending={createTag.isPending || updateTag.isPending}
                submitLabel={editing ? t('settings.tags.save') : t('settings.tags.create')}
                pendingLabel={t('common.processing')}
              />
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// Escalation Section
// ─────────────────────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  sla_at_risk:     'SLA em risco',
  sla_breach:      'SLA violado',
  no_update:       'Sem atualização',
  unassigned_time: 'Sem responsável',
}

const ACTION_LABELS: Record<string, string> = {
  reassign_to_user:    'Reatribuir para usuário',
  notify_admins:       'Notificar admins',
  increase_priority:   'Aumentar prioridade',
  add_tag:             'Adicionar tag',
  notify_senior_agents: 'Notificar agentes sênior',
}

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent']
const STATUS_OPTIONS = ['open', 'in_progress', 'waiting_client']

const blankForm: EscalationRuleCreate = {
  name: '',
  is_active: true,
  trigger_type: 'sla_breach',
  trigger_hours: 2,
  condition_priority: [],
  condition_status: [],
  action_type: 'notify_admins',
  action_user_id: null,
  action_tag_id: null,
  cooldown_hours: 24,
}

function EscalationSection() {
  const { t } = useTranslation()
  const { data: rules = [], isLoading } = useEscalationRules()
  const createRule = useCreateEscalationRule()
  const deleteRule = useDeleteEscalationRule()
  const runEscalation = useRunEscalation()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<EscalationRule | null>(null)
  const [runResult, setRunResult] = useState<string | null>(null)
  const { data: users = [] } = useAllUsers()
  const { tags = [] } = useTags()

  function openCreate() { setEditing(null); setModalOpen(true) }
  function openEdit(rule: EscalationRule) { setEditing(rule); setModalOpen(true) }

  function handleRunNow() {
    runEscalation.mutate(undefined, {
      onSuccess: (result) => {
        setRunResult(
          `${result.rules_evaluated} regras avaliadas — ${result.tickets_escalated} tickets escalados.`
        )
        setTimeout(() => setRunResult(null), 6000)
      },
    })
  }

  return (
    <section className="max-w-3xl pb-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-200">Regras de escalação</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Defina condições para escalação automática de tickets. Execute manualmente ou via cron:
            {' '}<code className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-xs text-slate-300">POST /v1/escalation/run</code>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {runResult && (
            <span className="text-xs text-emerald-400 font-mono">{runResult}</span>
          )}
          <button
            onClick={handleRunNow}
            disabled={runEscalation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-amber-700/50 text-amber-400 hover:bg-amber-950/30 disabled:opacity-50 transition-colors"
          >
            <Play className="w-3 h-3" />
            {runEscalation.isPending ? 'Executando...' : 'Executar agora'}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova regra
          </button>
        </div>
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-brand-border bg-white/2">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Gatilho</th>
              <th className="px-4 py-3">Ação</th>
              <th className="px-4 py-3 text-center">Ativo</th>
              <th className="px-4 py-3 w-20 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-mono animate-pulse">Carregando...</td></tr>
            ) : rules.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">Nenhuma regra configurada.</td></tr>
            ) : rules.map((rule) => (
              <tr key={rule.id} className="hover:bg-white/2 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-200">{rule.name}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {TRIGGER_LABELS[rule.trigger_type] ?? rule.trigger_type}
                  <span className="text-slate-600 ml-1">({rule.trigger_hours}h)</span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {ACTION_LABELS[rule.action_type] ?? rule.action_type}
                  {rule.action_user_name && <span className="text-slate-500 ml-1">→ {rule.action_user_name}</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-medium ${rule.is_active ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {rule.is_active ? 'Sim' : 'Não'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(rule)} className="p-1 text-slate-500 hover:text-slate-200 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteRule.mutate(rule.id)} className="p-1 text-slate-500 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <EscalationRuleModal
          editing={editing}
          users={users}
          tags={tags}
          onCreate={(data) => createRule.mutate(data, { onSuccess: () => setModalOpen(false) })}
          onClose={() => setModalOpen(false)}
          isPending={createRule.isPending}
          editingId={editing?.id ?? null}
        />
      )}
    </section>
  )
}

function EscalationRuleModal({
  editing,
  users,
  tags,
  onCreate,
  onClose,
  isPending,
  editingId,
}: {
  editing: EscalationRule | null
  users: { id: number; name: string; role: string }[]
  tags: { id: number; name: string }[]
  onCreate: (data: EscalationRuleCreate) => void
  onClose: () => void
  isPending: boolean
  editingId: number | null
}) {
  const updateRule = useUpdateEscalationRule(editingId ?? 0)

  const [form, setForm] = useState<EscalationRuleCreate>(
    editing
      ? {
          name: editing.name,
          is_active: editing.is_active,
          trigger_type: editing.trigger_type,
          trigger_hours: editing.trigger_hours,
          condition_priority: editing.condition_priority,
          condition_status: editing.condition_status,
          action_type: editing.action_type,
          action_user_id: editing.action_user_id,
          action_tag_id: editing.action_tag_id,
          cooldown_hours: editing.cooldown_hours,
        }
      : { ...blankForm }
  )

  function togglePriority(p: string) {
    setForm((f) => ({
      ...f,
      condition_priority: f.condition_priority?.includes(p)
        ? f.condition_priority.filter((x) => x !== p)
        : [...(f.condition_priority ?? []), p],
    }))
  }

  function toggleStatus(s: string) {
    setForm((f) => ({
      ...f,
      condition_status: f.condition_status?.includes(s)
        ? f.condition_status.filter((x) => x !== s)
        : [...(f.condition_status ?? []), s],
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editing && editingId) {
      updateRule.mutate(form, { onSuccess: onClose })
    } else {
      onCreate(form)
    }
  }

  const agents = users.filter((u) => u.role === 'agent')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-brand-surface border border-brand-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <header className="px-6 py-4 border-b border-brand-border flex items-center justify-between shrink-0">
          <h3 className="text-base font-semibold text-white">
            {editing ? 'Editar regra de escalação' : 'Nova regra de escalação'}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome da regra</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
              placeholder="Ex.: Escalar SLA violado urgente"
            />
          </div>

          {/* Trigger */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gatilho</label>
              <select
                value={form.trigger_type}
                onChange={(e) => setForm({ ...form, trigger_type: e.target.value })}
                className={inputCls}
              >
                {Object.entries(TRIGGER_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Limiar (horas)</label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={form.trigger_hours}
                onChange={(e) => setForm({ ...form, trigger_hours: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Condições <span className="normal-case font-normal text-slate-600">(vazio = todos)</span>
            </label>
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Prioridades</p>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITY_OPTIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePriority(p)}
                    className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                      form.condition_priority?.includes(p)
                        ? 'bg-brand-purple/20 border-brand-purple/50 text-brand-purple'
                        : 'bg-white/5 border-white/15 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStatus(s)}
                    className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                      form.condition_status?.includes(s)
                        ? 'bg-brand-purple/20 border-brand-purple/50 text-brand-purple'
                        : 'bg-white/5 border-white/15 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ação</label>
            <select
              value={form.action_type}
              onChange={(e) => setForm({ ...form, action_type: e.target.value, action_user_id: null, action_tag_id: null })}
              className={inputCls}
            >
              {Object.entries(ACTION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            {form.action_type === 'reassign_to_user' && (
              <select
                required
                value={form.action_user_id ?? ''}
                onChange={(e) => setForm({ ...form, action_user_id: Number(e.target.value) || null })}
                className={inputCls}
              >
                <option value="">Selecionar agente...</option>
                {agents.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            )}
            {form.action_type === 'add_tag' && (
              <select
                required
                value={form.action_tag_id ?? ''}
                onChange={(e) => setForm({ ...form, action_tag_id: Number(e.target.value) || null })}
                className={inputCls}
              >
                <option value="">Selecionar tag...</option>
                {tags.map((tg) => (
                  <option key={tg.id} value={tg.id}>{tg.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Cooldown + Active */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cooldown (horas)</label>
              <input
                type="number"
                min={1}
                step={1}
                value={form.cooldown_hours}
                onChange={(e) => setForm({ ...form, cooldown_hours: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-brand-accent focus:ring-brand-accent"
                />
                <span className="text-sm text-slate-300">Regra ativa</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || updateRule.isPending}
              className="px-4 py-1.5 text-sm rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 disabled:opacity-50 transition-colors"
            >
              {editing ? 'Salvar alterações' : 'Criar regra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
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
