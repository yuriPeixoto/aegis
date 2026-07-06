import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X } from 'lucide-react'
import type { ChecklistItem } from '../../types/ticket'
import {
  useCreateChecklistItem,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
} from '../../hooks/useTickets'

export function ChecklistPanel({
  ticketId,
  items,
}: {
  ticketId: number
  items: ChecklistItem[]
}) {
  const { t } = useTranslation()
  const [newText, setNewText] = useState('')
  const createItem = useCreateChecklistItem(ticketId)
  const updateItem = useUpdateChecklistItem(ticketId)
  const deleteItem = useDeleteChecklistItem(ticketId)

  const done = items.filter((i) => i.is_done).length
  const total = items.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const text = newText.trim()
    if (!text) return
    createItem.mutate({ text }, { onSuccess: () => setNewText('') })
  }

  return (
    <div className="px-5 py-4 border-b border-brand-border/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          {t('inbox.detail.checklist.title')}
        </h3>
        {total > 0 && (
          <span className="text-[10px] font-mono text-slate-400">
            {done}/{total}
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-start gap-2 py-1 px-1.5 rounded-md hover:bg-white/5"
          >
            <input
              type="checkbox"
              checked={item.is_done}
              disabled={updateItem.isPending}
              onChange={(e) =>
                updateItem.mutate({ itemId: item.id, is_done: e.target.checked })
              }
              className="mt-0.5 w-3.5 h-3.5 rounded border-white/20 bg-brand-surface text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer shrink-0"
            />
            <span
              className={`flex-1 text-sm leading-snug break-words ${
                item.is_done ? 'text-slate-500 line-through' : 'text-slate-300'
              }`}
            >
              {item.text}
            </span>
            <button
              type="button"
              onClick={() => deleteItem.mutate(item.id)}
              disabled={deleteItem.isPending}
              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all shrink-0"
              title={t('inbox.detail.checklist.remove')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-slate-600 italic">{t('inbox.detail.checklist.empty')}</p>
        )}
      </div>

      <form onSubmit={handleAdd} className="flex items-center gap-2 mt-2">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder={t('inbox.detail.checklist.addPlaceholder')}
          className="flex-1 bg-brand-surface border border-white/15 rounded px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-purple"
        />
        <button
          type="submit"
          disabled={createItem.isPending || !newText.trim()}
          className="p-1.5 rounded bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors disabled:opacity-40 shrink-0"
          title={t('inbox.detail.checklist.add')}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  )
}
