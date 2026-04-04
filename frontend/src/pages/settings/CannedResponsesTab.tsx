import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { MessageSquare, Edit, Trash2 } from 'lucide-react'
import {
  useCannedResponses,
  useCreateCannedResponse,
  useUpdateCannedResponse,
  useDeleteCannedResponse,
} from '../../hooks/useCannedResponses'
import { useAllUsers } from '../../hooks/useUsers'
import type { CannedResponse } from '../../hooks/useCannedResponses'

export function CannedResponsesTab() {
  const { t } = useTranslation()
  const { data: responses, isLoading } = useCannedResponses()
  const createResponse = useCreateCannedResponse()
  const updateResponse = useUpdateCannedResponse()
  const deleteResponse = useDeleteCannedResponse()
  const { data: usersData } = useAllUsers()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CannedResponse | null>(null)
  const [form, setForm] = useState<Partial<CannedResponse>>({ title: '', body: '', actions: {} })

  const handleEdit = (res: CannedResponse) => {
    setEditing(res)
    setForm({ title: res.title, body: res.body, actions: res.actions || {} })
    setModalOpen(true)
  }

  const handleSave = () => {
    if (editing) {
      updateResponse.mutate({ id: editing.id, ...form }, {
        onSuccess: () => { setModalOpen(false); toast.success('Resposta pronta atualizada com sucesso!') },
        onError: () => toast.error('Erro ao atualizar resposta pronta.'),
      })
    } else {
      createResponse.mutate(form as any, {
        onSuccess: () => { setModalOpen(false); toast.success('Resposta pronta criada com sucesso!') },
        onError: () => toast.error('Erro ao criar resposta pronta.'),
      })
    }
  }

  const handleDelete = (id: number) => {
    if (confirm(t('common.confirmDelete'))) {
      deleteResponse.mutate(id, {
        onSuccess: () => toast.success('Resposta pronta excluída.'),
        onError: () => toast.error('Erro ao excluir resposta pronta.'),
      })
    }
  }

  if (isLoading) return <p className="text-sm text-slate-500">{t('inbox.loading')}</p>

  const agents = usersData?.filter((u) => u.role !== 'viewer') || []

  return (
    <section className="pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100 leading-tight">{t('settings.cannedResponses.title')}</h2>
          <p className="text-sm text-slate-400 mt-1">{t('settings.cannedResponses.subtitle')}</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm({ title: '', body: '', actions: {} }); setModalOpen(true) }}
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
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('settings.cannedResponses.colTitle')}</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('settings.cannedResponses.colActions')}</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {responses?.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-500">{t('settings.cannedResponses.empty')}</td></tr>
            )}
            {responses?.map((res) => (
              <tr key={res.id} className="hover:bg-white/2 transition-colors group">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-slate-200 block truncate max-w-xs" title={res.title}>{res.title}</span>
                  <span className="text-xs text-slate-500 block truncate max-w-xs mt-0.5">{res.body.substring(0, 60)}...</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {res.actions?.status && <span className="px-1.5 py-0.5 bg-slate-700 border border-slate-600 rounded text-[10px] font-medium text-slate-300">Status: {t('status.' + res.actions.status.toUpperCase())}</span>}
                    {res.actions?.priority && <span className="px-1.5 py-0.5 bg-slate-700 border border-slate-600 rounded text-[10px] font-medium text-slate-300">Prio: {t('priority.' + res.actions.priority.toUpperCase())}</span>}
                    {res.actions?.assigned_to_user_id && <span className="px-1.5 py-0.5 bg-slate-700 border border-slate-600 rounded text-[10px] font-medium text-slate-300">Assign: {agents.find((a) => a.id === res.actions?.assigned_to_user_id)?.name}</span>}
                    {!res.actions?.status && !res.actions?.priority && !res.actions?.assigned_to_user_id && <span className="text-[10px] text-slate-500">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(res)} className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-md" title={t('settings.cannedResponses.edit')}>
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(res.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-md" title={t('settings.cannedResponses.delete')}>
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
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('settings.cannedResponses.modal.fieldTitle')}</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('settings.cannedResponses.modal.titlePlaceholder')} className="w-full bg-slate-800 border border-brand-border rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-purple/40 focus:border-brand-purple/50 transition-all" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('settings.cannedResponses.modal.fieldBody')}</label>
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder={t('settings.cannedResponses.modal.bodyPlaceholder')} rows={6} className="w-full bg-slate-800 border border-brand-border rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-purple/40 focus:border-brand-purple/50 transition-all resize-none" />
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="text-[10px] text-slate-500 font-medium">{t('settings.cannedResponses.modal.variables')}</span>
                  {['{{ticket.requester.name}}', '{{ticket.id}}', '{{user.name}}'].map((v) => (
                    <button key={v} type="button" onClick={() => setForm({ ...form, body: (form.body || '') + v })} className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-brand-purple hover:bg-brand-purple/10 transition-colors">{v}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Status</label>
                  <select value={form.actions?.status || ''} onChange={(e) => setForm({ ...form, actions: { ...form.actions, status: e.target.value || undefined } })} className="w-full bg-slate-800 border border-brand-border rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-purple/40">
                    <option value="">{t('settings.cannedResponses.modal.noAction')}</option>
                    {['open','in_progress','waiting_client','resolved','closed'].map((s) => (
                      <option key={s} value={s}>{t('status.' + s.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Prioridade</label>
                  <select value={form.actions?.priority || ''} onChange={(e) => setForm({ ...form, actions: { ...form.actions, priority: e.target.value || undefined } })} className="w-full bg-slate-800 border border-brand-border rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-purple/40">
                    <option value="">{t('settings.cannedResponses.modal.noAction')}</option>
                    {['urgent','high','medium','low'].map((p) => (
                      <option key={p} value={p}>{t('priority.' + p.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Atribuir</label>
                  <select value={form.actions?.assigned_to_user_id || ''} onChange={(e) => setForm({ ...form, actions: { ...form.actions, assigned_to_user_id: e.target.value ? parseInt(e.target.value) : undefined } })} className="w-full bg-slate-800 border border-brand-border rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-purple/40">
                    <option value="">{t('settings.cannedResponses.modal.noAction')}</option>
                    {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-brand-border flex items-center justify-end gap-3 shrink-0">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors">
                {t('settings.cannedResponses.modal.cancel')}
              </button>
              <button onClick={handleSave} disabled={!form.title || !form.body} className="px-6 py-2 bg-brand-purple hover:bg-brand-purple-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-brand-purple/20">
                {t('settings.cannedResponses.modal.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
