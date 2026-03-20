import { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Send } from 'lucide-react'
import { useMessages, useSendMessage } from '../../hooks/useTickets'

interface ConversationPanelProps {
  ticketId: number
  locale: string
}

function formatTime(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ConversationPanel({ ticketId, locale }: ConversationPanelProps) {
  const { t } = useTranslation()
  const { data: messages = [] } = useMessages(ticketId)
  const { mutate: sendMessage, isPending } = useSendMessage(ticketId)
  const [body, setBody] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return
    sendMessage(
      { body: trimmed },
      { onSuccess: () => setBody('') },
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="flex flex-col">
      <h3 className="px-5 pt-4 pb-3 text-xs font-semibold text-slate-400 uppercase tracking-widest border-b border-brand-border/50">
        {t('inbox.detail.conversation')}
      </h3>

      {/* Thread */}
      <div className="px-5 py-3 space-y-3 min-h-[80px]">
        {messages.length === 0 ? (
          <p className="text-xs text-slate-500 italic">{t('inbox.detail.noMessages')}</p>
        ) : (
          messages.map((msg) => {
            const isOutbound = msg.direction === 'outbound'
            return (
              <div
                key={msg.id}
                className={`flex flex-col gap-1 ${isOutbound ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    isOutbound
                      ? 'bg-brand-accent/20 border border-brand-accent/25 text-slate-100'
                      : 'bg-white/5 border border-white/10 text-slate-200'
                  }`}
                >
                  {msg.body}
                </div>
                <div className={`flex items-center gap-1.5 ${isOutbound ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[10px] font-medium text-slate-400">{msg.author_name}</span>
                  <span className="text-[10px] text-slate-600">·</span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {formatTime(msg.created_at, locale)}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <form onSubmit={handleSubmit} className="px-5 pb-4 pt-2 border-t border-brand-border/50">
        <div className="flex gap-2 items-end">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('inbox.detail.replyPlaceholder')}
            rows={2}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:border-brand-accent"
          />
          <button
            type="submit"
            disabled={isPending || !body.trim()}
            className="p-2.5 rounded-lg bg-brand-accent text-white hover:bg-brand-accent/90 disabled:opacity-40 transition-colors shrink-0"
            title={t('inbox.detail.send')}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-1.5">{t('inbox.detail.replyHint')}</p>
      </form>
    </div>
  )
}
