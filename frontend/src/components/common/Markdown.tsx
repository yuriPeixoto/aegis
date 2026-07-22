import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { remarkMentions } from '../../lib/remarkMentions'

interface MarkdownProps {
  children: string
  className?: string
  /** Tailwind classes applied to @mentions (remarkMentions output) — differs by surface (e.g. amber for internal notes). */
  mentionClassName?: string
}

// Renders user-authored Markdown (ticket messages, notes, descriptions) with
// a dark-theme style matching the rest of the app. remark-breaks keeps plain
// Enter presses as line breaks (CommonMark otherwise merges them), since the
// textareas here are chat-style, not paragraph-style, editors.
export function Markdown({ children, className, mentionClassName }: MarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMentions]}
        remarkRehypeOptions={{
          handlers: {
            mention(_state, node: { value: string }) {
              return {
                type: 'element',
                tagName: 'mention',
                properties: {},
                children: [{ type: 'text', value: node.value }],
              }
            },
          },
        }}
        components={{
          mention: ({ children: mentionText }) => (
            <span className={mentionClassName ?? 'font-semibold'}>{mentionText}</span>
          ),
          a: ({ children: linkText, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-accent underline decoration-brand-accent/40 hover:decoration-brand-accent transition-colors"
            >
              {linkText}
            </a>
          ),
          p: ({ children: pText }) => <p className="mb-2 last:mb-0">{pText}</p>,
          ul: ({ children: listItems }) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-0.5">{listItems}</ul>,
          ol: ({ children: listItems }) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-0.5">{listItems}</ol>,
          blockquote: ({ children: quoteText }) => (
            <blockquote className="border-l-2 border-white/20 pl-3 italic text-slate-400 mb-2 last:mb-0">
              {quoteText}
            </blockquote>
          ),
          code: ({ className: codeClassName, children: codeText }) => {
            const isBlock = /language-/.test(codeClassName ?? '')
            if (!isBlock) {
              return (
                <code className="bg-black/30 border border-white/10 rounded px-1 py-0.5 font-mono text-[0.85em]">
                  {codeText}
                </code>
              )
            }
            return <code className={codeClassName}>{codeText}</code>
          },
          pre: ({ children: preChildren }) => (
            <pre className="bg-black/30 border border-white/10 rounded-lg p-3 overflow-x-auto font-mono text-xs mb-2 last:mb-0">
              {preChildren}
            </pre>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
