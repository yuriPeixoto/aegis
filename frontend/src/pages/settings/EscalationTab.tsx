import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Edit, Trash2, Play, Plus, X } from 'lucide-react'
import {
  useEscalationRules,
  useCreateEscalationRule,
  useUpdateEscalationRule,
  useDeleteEscalationRule,
  useRunEscalation,
  type EscalationRule,
  type EscalationRuleCreate,
} from '../../hooks/useEscalation'
import { useAllUsers } from '../../hooks/useUsers'
import { useTags } from '../../hooks/useTags'
import { inputCls } from './shared'

const TRIGGER_KEYS = ['sla_at_risk', 'sla_breach', 'no_update', 'unassigned_time'] as const
const ACTION_KEYS = ['reassign_to_user', 'notify_admins', 'increase_priority', 'add_tag', 'notify_senior_agents'] as const
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
  const { t } = useTranslation()
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
      : { ...blankForm },
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
            {editing ? t('settings.escalation.editTitle') : t('settings.escalation.createTitle')}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings.escalation.fieldName')}</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder={t('settings.escalation.namePlaceholder')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings.escalation.fieldTrigger')}</label>
              <select value={form.trigger_type} onChange={(e) => setForm({ ...form, trigger_type: e.target.value })} className={inputCls}>
                {TRIGGER_KEYS.map((v) => <option key={v} value={v}>{t(`settings.escalation.trigger.${v}`)}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings.escalation.fieldThreshold')}</label>
              <input type="number" min={0.5} step={0.5} value={form.trigger_hours} onChange={(e) => setForm({ ...form, trigger_hours: Number(e.target.value) })} className={inputCls} />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t('settings.escalation.fieldConditions')} <span className="normal-case font-normal text-slate-600">{t('settings.escalation.conditionsHint')}</span>
            </label>
            <div>
              <p className="text-xs text-slate-500 mb-1.5">{t('settings.escalation.priorities')}</p>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITY_OPTIONS.map((p) => (
                  <button key={p} type="button" onClick={() => togglePriority(p)} className={`text-xs px-2.5 py-1 rounded border transition-colors ${form.condition_priority?.includes(p) ? 'bg-brand-purple/20 border-brand-purple/50 text-brand-purple' : 'bg-white/5 border-white/15 text-slate-400 hover:bg-white/10'}`}>{p}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1.5">{t('settings.escalation.statuses')}</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => toggleStatus(s)} className={`text-xs px-2.5 py-1 rounded border transition-colors ${form.condition_status?.includes(s) ? 'bg-brand-purple/20 border-brand-purple/50 text-brand-purple' : 'bg-white/5 border-white/15 text-slate-400 hover:bg-white/10'}`}>{s}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings.escalation.fieldAction')}</label>
            <select value={form.action_type} onChange={(e) => setForm({ ...form, action_type: e.target.value, action_user_id: null, action_tag_id: null })} className={inputCls}>
              {ACTION_KEYS.map((v) => <option key={v} value={v}>{t(`settings.escalation.action.${v}`)}</option>)}
            </select>
            {form.action_type === 'reassign_to_user' && (
              <select required value={form.action_user_id ?? ''} onChange={(e) => setForm({ ...form, action_user_id: Number(e.target.value) || null })} className={inputCls}>
                <option value="">{t('settings.escalation.selectAgent')}</option>
                {agents.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
            {form.action_type === 'add_tag' && (
              <select required value={form.action_tag_id ?? ''} onChange={(e) => setForm({ ...form, action_tag_id: Number(e.target.value) || null })} className={inputCls}>
                <option value="">{t('settings.escalation.selectTag')}</option>
                {tags.map((tg) => <option key={tg.id} value={tg.id}>{tg.name}</option>)}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings.escalation.fieldCooldown')}</label>
              <input type="number" min={1} step={1} value={form.cooldown_hours} onChange={(e) => setForm({ ...form, cooldown_hours: Number(e.target.value) })} className={inputCls} />
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-brand-accent focus:ring-brand-accent" />
                <span className="text-sm text-slate-300">{t('settings.escalation.isActive')}</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">{t('settings.escalation.cancel')}</button>
            <button type="submit" disabled={isPending || updateRule.isPending} className="px-4 py-1.5 text-sm rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 disabled:opacity-50 transition-colors">
              {editing ? t('settings.escalation.save') : t('settings.escalation.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function EscalationTab() {
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
        setRunResult(t('settings.escalation.runResult', { rules: result.rules_evaluated, tickets: result.tickets_escalated }))
        setTimeout(() => setRunResult(null), 6000)
      },
    })
  }

  return (
    <section className="max-w-3xl pb-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-200">{t('settings.escalation.title')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('settings.escalation.subtitle')}{' '}
            <code className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-xs text-slate-300">POST /v1/escalation/run</code>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {runResult && <span className="text-xs text-emerald-400 font-mono">{runResult}</span>}
          <button onClick={handleRunNow} disabled={runEscalation.isPending} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-amber-700/50 text-amber-400 hover:bg-amber-950/30 disabled:opacity-50 transition-colors">
            <Play className="w-3 h-3" />
            {runEscalation.isPending ? t('settings.escalation.running') : t('settings.escalation.runNow')}
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            {t('settings.escalation.newRule')}
          </button>
        </div>
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-brand-border bg-white/2">
            <tr>
              <th className="px-4 py-3">{t('settings.escalation.colName')}</th>
              <th className="px-4 py-3">{t('settings.escalation.colTrigger')}</th>
              <th className="px-4 py-3">{t('settings.escalation.colAction')}</th>
              <th className="px-4 py-3 text-center">{t('settings.escalation.colActive')}</th>
              <th className="px-4 py-3 w-20 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-mono animate-pulse">{t('settings.escalation.loading')}</td></tr>
            ) : rules.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">{t('settings.escalation.empty')}</td></tr>
            ) : rules.map((rule) => (
              <tr key={rule.id} className="hover:bg-white/2 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-200">{rule.name}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {t(`settings.escalation.trigger.${rule.trigger_type}`, { defaultValue: rule.trigger_type })}
                  <span className="text-slate-600 ml-1">({rule.trigger_hours}h)</span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {t(`settings.escalation.action.${rule.action_type}`, { defaultValue: rule.action_type })}
                  {rule.action_user_name && <span className="text-slate-500 ml-1">→ {rule.action_user_name}</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-medium ${rule.is_active ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {rule.is_active ? t('common.yes') : t('common.no')}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(rule)} className="p-1 text-slate-500 hover:text-slate-200 transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => deleteRule.mutate(rule.id)} className="p-1 text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
