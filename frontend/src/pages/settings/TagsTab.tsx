import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Edit, Trash2 } from 'lucide-react'
import { useTags, type TagCreate } from '../../hooks/useTags'
import { ModalActions } from './shared'
import type { Tag } from '../../types/ticket'

export function TagsTab() {
  const { t } = useTranslation()
  const { tags, isLoading, createTag, updateTag, deleteTag } = useTags()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Tag | null>(null)
  const [form, setForm] = useState<TagCreate>({ name: '', color: '#6B7280', description: '' })

  const handleEdit = (tag: Tag) => {
    setEditing(tag)
    setForm({ name: tag.name, color: tag.color, description: tag.description || '' })
    setModalOpen(true)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      updateTag.mutate({ id: editing.id, tagIn: form }, {
        onSuccess: () => { setModalOpen(false); toast.success(t('settings.tags.saved')) },
        onError: () => toast.error(t('settings.tags.error')),
      })
    } else {
      createTag.mutate(form, {
        onSuccess: () => { setModalOpen(false); toast.success(t('settings.tags.created')) },
        onError: () => toast.error(t('settings.tags.error')),
      })
    }
  }

  const handleDelete = (id: number) => {
    if (confirm(t('common.confirmDelete', 'Tem certeza?'))) {
      deleteTag.mutate(id, {
        onSuccess: () => toast.success(t('settings.tags.deleted')),
        onError: () => toast.error(t('settings.tags.errorDelete')),
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
          onClick={() => { setEditing(null); setForm({ name: '', color: '#6B7280', description: '' }); setModalOpen(true) }}
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
                  <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{tag.description || '—'}</td>
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
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-black/20 border border-brand-border rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-accent transition-colors" placeholder="Ex: Urgente, Bug, etc" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings.tags.fieldColor')}</label>
                <div className="flex gap-2">
                  <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-9 w-12 bg-black/20 border border-brand-border rounded-md p-1 cursor-pointer" />
                  <input required value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="flex-1 bg-black/20 border border-brand-border rounded-md px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-brand-accent transition-colors" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings.tags.fieldDescription')}</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-black/20 border border-brand-border rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-accent transition-colors h-20 resize-none" />
              </div>
              <ModalActions onClose={() => setModalOpen(false)} isPending={createTag.isPending || updateTag.isPending} submitLabel={editing ? t('settings.tags.save') : t('settings.tags.create')} pendingLabel={t('common.processing')} />
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
