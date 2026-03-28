import { useRef, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Lock } from 'lucide-react'
import { useMessages, useSendMessage, useUsers } from '../../hooks/useTickets'

interface ConversationPanelProps {
  ticketId: number
  locale: string
}

interface UserOption {
  id: number
  name: string
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

/**
 * Renders message body with @mentions highlighted in amber.
 */
function MessageBody({ body, isInternal }: { body: string; isInternal: boolean }) {
  if (!isInternal) return <span className="whitespace-pre-wrap break-words">{body}</span>

  const parts = body.split(/(@\S+)/g)
  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} className="font-semibold text-amber-300">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </span>
  )
}

export function ConversationPanel({ ticketId, locale }: ConversationPanelProps) {
  const { t } = useTranslation()
  const { data: messages = [] } = useMessages(ticketId)
  const { mutate: sendMessage, isPending } = useSendMessage(ticketId)
  const { data: users = [] } = useUsers()

  const [body, setBody] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionAnchor, setMentionAnchor] = useState(0) // cursor position where @ was typed

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Detect @mention as user types
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      setBody(value)

      if (!isInternal) {
        setMentionQuery(null)
        return
      }

      const cursor = e.target.selectionStart ?? value.length
      // Find the last @ before the cursor that isn't preceded by a word char
      const textBeforeCursor = value.slice(0, cursor)
      const match = textBeforeCursor.match(/@(\w*)$/)
      if (match) {
        setMentionQuery(match[1].toLowerCase())
        setMentionAnchor(cursor - match[0].length)
      } else {
        setMentionQuery(null)
      }
    },
    [isInternal],
  )

  const filteredUsers: UserOption[] =
    mentionQuery !== null
      ? users.filter((u) => u.name.toLowerCase().includes(mentionQuery))
      : []

  const insertMention = (user: UserOption) => {
    const before = body.slice(0, mentionAnchor)
    const after = body.slice(textareaRef.current?.selectionStart ?? body.length)
    const newBody = `${before}@${user.name} ${after}`
    setBody(newBody)
    setMentionQuery(null)
    textareaRef.current?.focus()
  }

  // Extract mentioned user IDs from body at submit time
  const extractMentions = (text: string): number[] => {
    const mentioned: number[] = []
    users.forEach((u) => {
      if (text.includes(`@${u.name}`)) mentioned.push(u.id)
    })
    return mentioned
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return
    sendMessage(
      {
        body: trimmed,
        is_internal: isInternal,
        mentioned_user_ids: isInternal ? extractMentions(trimmed) : [],
      },
      { onSuccess: () => setBody('') },
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredUsers.length > 0) {
      // Let the dropdown handle Enter/Escape; block form submit
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault()
        if (e.key === 'Escape') setMentionQuery(null)
        if (e.key === 'Enter') insertMention(filteredUsers[0])
        return
      }
    }
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
            const internal = msg.is_internal

            if (internal) {
              return (
                <div key={msg.id} className="flex flex-col gap-1">
                  <div className="rounded-xl px-3 py-2 text-sm leading-relaxed bg-amber-950/40 border border-amber-700/40 text-amber-100">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                        {t('inbox.detail.internalNote')}
                      </span>
                    </div>
                    <MessageBody body={msg.body} isInternal />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-amber-600">{msg.author_name}</span>
                    <span className="text-[10px] text-slate-600">·</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {formatTime(msg.created_at, locale)}
                    </span>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col gap-1 ${isOutbound ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    isOutbound
                      ? 'bg-brand-accent/20 border border-brand-accent/25 text-slate-100'
                      : 'bg-white/5 border border-white/10 text-slate-200'
                  }`}
                >
                  <MessageBody body={msg.body} isInternal={false} />
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
        {/* Mode toggle */}
        <div className="flex gap-1 mb-2">
          <button
            type="button"
            onClick={() => setIsInternal(false)}
            className={`text-[10px] font-semibold px-2.5 py-1 rounded transition-colors ${
              !isInternal
                ? 'bg-brand-accent/20 border border-brand-accent/40 text-brand-accent'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t('inbox.detail.replyPublic')}
          </button>
          <button
            type="button"
            onClick={() => setIsInternal(true)}
            className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded transition-colors ${
              isInternal
                ? 'bg-amber-950/60 border border-amber-700/50 text-amber-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Lock className="w-2.5 h-2.5" />
            {t('inbox.detail.internalNote')}
          </button>
        </div>

        <div className="relative flex gap-2 items-stretch">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isInternal
                  ? t('inbox.detail.internalNotePlaceholder')
                  : t('inbox.detail.replyPlaceholder')
              }
              rows={2}
              className={`h-full w-full rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none transition-colors ${
                isInternal
                  ? 'bg-amber-950/30 border border-amber-700/40 focus:border-amber-600'
                  : 'bg-slate-800 border border-slate-700 focus:border-brand-accent'
              }`}
            />

            {/* @mention dropdown */}
            {mentionQuery !== null && filteredUsers.length > 0 && (
              <div className="absolute bottom-full left-0 mb-1 w-48 bg-brand-surface border border-brand-border rounded-lg shadow-xl z-50 overflow-hidden">
                {filteredUsers.slice(0, 6).map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault() // prevent textarea blur
                      insertMention(user)
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-white/10 transition-colors"
                  >
                    <span className="text-amber-400 font-semibold">@</span>
                    {user.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending || !body.trim()}
            className={`p-2.5 rounded-lg text-white transition-colors shrink-0 self-end disabled:opacity-40 ${
              isInternal
                ? 'bg-amber-700 hover:bg-amber-600'
                : 'bg-brand-accent hover:bg-brand-accent/90'
            }`}
            title={t('inbox.detail.send')}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[10px] text-slate-600 mt-1.5">
          {isInternal
            ? t('inbox.detail.internalNoteHint')
            : t('inbox.detail.replyHint')}
        </p>
      </form>
    </div>
  )
}
