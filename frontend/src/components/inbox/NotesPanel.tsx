import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Send } from 'lucide-react'
import { useNotes, useCreateNote } from '../../hooks/useTickets'

interface NotesPanelProps {
  ticketId: number
  locale: string
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NotesPanel({ ticketId, locale }: NotesPanelProps) {
  const { t } = useTranslation()
  const { data: notes = [], isLoading } = useNotes(ticketId)
  const createNote = useCreateNote(ticketId)
  const [body, setBody] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    createNote.mutate(
      { body: body.trim() },
      { onSuccess: () => setBody('') },
    )
  }

  return (
    <div className="px-5 py-4">
      <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-4">
        {t('inbox.detail.notes')}
      </h3>

      {isLoading ? (
        <p className="text-xs text-slate-600 font-mono animate-pulse">{t('inbox.detail.loading')}</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-slate-600 font-mono mb-4">{t('inbox.detail.noNotes')}</p>
      ) : (
        <div className="space-y-2 mb-4">
          {notes.map((note) => (
            <div key={note.id} className="bg-white/5 border border-white/5 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-brand-purple">
                  {note.author?.name ?? t('inbox.detail.unknownAuthor')}
                </span>
                <span className="text-[10px] font-mono text-slate-600">
                  {formatDate(note.created_at, locale)}
                </span>
              </div>
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{note.body}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('inbox.detail.notePlaceholder')}
          rows={2}
          className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-brand-purple"
        />
        <button
          type="submit"
          disabled={createNote.isPending || !body.trim()}
          className="px-2 py-1.5 bg-brand-purple/20 border border-brand-purple/30 text-brand-purple rounded hover:bg-brand-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
