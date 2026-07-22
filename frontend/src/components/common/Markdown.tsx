import ReactMarkdown, { type Options as ReactMarkdownOptions } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { remarkMentions } from '../../lib/remarkMentions'

interface MarkdownProps {
  children: string
  className?: string
  /** Tailwind classes applied to @mentions (remarkMentions output) — differs by surface (e.g. amber for internal notes). */
  mentionClassName?: string
}

// "mention" is a custom mdast/hast node type (see remarkMentions), not a real
// HTML tag — react-markdown's Handlers/Components types don't know about it.
// Keeping these as un-annotated consts (instead of inlining the literals as
// prop values) sidesteps TS's excess-property check on the closed key unions,
// since the check only applies to object literals checked directly against a
// target type, not to a plain variable reference.
// Cast needed here (unlike `components` below): Handlers' key union has zero
// overlap with our single custom "mention" key, which trips TS's "weak type"
// check ("no properties in common") even though it's a plain variable, not a
// literal checked in place.
const remarkRehypeOptions = {
  handlers: {
    mention(_state: unknown, node: { value: string }) {
      return {
        type: 'element',
        tagName: 'mention',
        properties: {},
        children: [{ type: 'text', value: node.value }],
      }
    },
  },
} as unknown as NonNullable<ReactMarkdownOptions['remarkRehypeOptions']>

// Renders user-authored Markdown (ticket messages, notes, descriptions) with
// a dark-theme style matching the rest of the app. remark-breaks keeps plain
// Enter presses as line breaks (CommonMark otherwise merges them), since the
// textareas here are chat-style, not paragraph-style, editors.
export function Markdown({ children, className, mentionClassName }: MarkdownProps) {
  const components = {
    mention: ({ children: mentionText }: { children?: React.ReactNode }) => (
      <span className={mentionClassName ?? 'font-semibold'}>{mentionText}</span>
    ),
    a: ({ children: linkText, ...props }: React.ComponentPropsWithoutRef<'a'>) => (
      <a
        {...props}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand-accent underline decoration-brand-accent/40 hover:decoration-brand-accent transition-colors"
      >
        {linkText}
      </a>
    ),
    p: ({ children: pText }: React.ComponentPropsWithoutRef<'p'>) => <p className="mb-2 last:mb-0">{pText}</p>,
    ul: ({ children: listItems }: React.ComponentPropsWithoutRef<'ul'>) => (
      <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-0.5">{listItems}</ul>
    ),
    ol: ({ children: listItems }: React.ComponentPropsWithoutRef<'ol'>) => (
      <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-0.5">{listItems}</ol>
    ),
    blockquote: ({ children: quoteText }: React.ComponentPropsWithoutRef<'blockquote'>) => (
      <blockquote className="border-l-2 border-white/20 pl-3 italic text-slate-400 mb-2 last:mb-0">
        {quoteText}
      </blockquote>
    ),
    code: ({ className: codeClassName, children: codeText }: React.ComponentPropsWithoutRef<'code'>) => {
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
    pre: ({ children: preChildren }: React.ComponentPropsWithoutRef<'pre'>) => (
      <pre className="bg-black/30 border border-white/10 rounded-lg p-3 overflow-x-auto font-mono text-xs mb-2 last:mb-0">
        {preChildren}
      </pre>
    ),
  }

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMentions]}
        remarkRehypeOptions={remarkRehypeOptions}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
