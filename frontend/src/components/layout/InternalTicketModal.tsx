import React, { useState, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Send, AlertCircle, Loader2 } from 'lucide-react'
import { useCreateInternalTicket } from '../../hooks/useTickets'
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut'
import { FormSelect } from '../common/FormSelect'

interface InternalTicketModalProps {
  isOpen: boolean
  onClose: () => void
}

export const InternalTicketModal = memo(function InternalTicketModal({ isOpen, onClose }: InternalTicketModalProps) {
  const { t } = useTranslation()
  const { mutate, isPending, error } = useCreateInternalTicket()

  const [form, setForm] = useState({
    subject: '',
    description: '',
    type: 'improvement',
    priority: 'medium',
  })

  useKeyboardShortcut('Escape', onClose, { enabled: isOpen, ignoreInputs: false })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.subject.trim()) return

    mutate({
      ...form,
      meta: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        version: '0.1.0',
      }
    }, {
      onSuccess: () => {
        onClose()
        setForm({
          subject: '',
          description: '',
          type: 'improvement',
          priority: 'medium',
        })
      }
    })
  }

  const TYPES = [
    { value: 'bug', label: t('inbox.internalTicket.typeBug') },
    { value: 'improvement', label: t('inbox.internalTicket.typeImprovement') },
    { value: 'suggestion', label: t('inbox.internalTicket.typeSuggestion') },
  ]

  const PRIORITIES = [
    { value: 'low', label: t('priority.LOW') },
    { value: 'medium', label: t('priority.MEDIUM') },
    { value: 'high', label: t('priority.HIGH') },
    { value: 'urgent', label: t('priority.URGENT') },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/80 backdrop-blur-sm">
      <div className="bg-brand-dark border border-brand-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Send className="w-5 h-5 text-brand-purple" />
            {t('inbox.internalTicket.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {t('inbox.internalTicket.error')}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t('inbox.internalTicket.subject')}
            </label>
            <input
              required
              type="text"
              value={form.subject}
              onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
              className="w-full bg-slate-800/50 border border-brand-border rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/40 focus:border-brand-purple/60 transition-all"
              placeholder={t('inbox.internalTicket.subjectPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label={t('inbox.internalTicket.type')}
              value={form.type}
              options={TYPES}
              onChange={(v) => setForm((prev) => ({ ...prev, type: v }))}
            />
            <FormSelect
              label={t('inbox.internalTicket.priority')}
              value={form.priority}
              options={PRIORITIES}
              onChange={(v) => setForm((prev) => ({ ...prev, priority: v }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t('inbox.internalTicket.description')}
            </label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full bg-slate-800/50 border border-brand-border rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/40 focus:border-brand-purple/60 transition-all resize-none"
              placeholder={t('inbox.internalTicket.descriptionPlaceholder')}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors"
            >
              {t('inbox.cancel')}
            </button>
            <button
              disabled={isPending}
              type="submit"
              className="px-4 py-2 bg-brand-purple hover:bg-brand-purple/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-lg shadow-brand-purple/20 transition-all flex items-center gap-2"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {t('inbox.send')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
})
