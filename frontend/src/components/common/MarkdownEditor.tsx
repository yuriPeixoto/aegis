import { forwardRef } from 'react'
import { Markdown } from './Markdown'

interface MarkdownEditorProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onModeChange?: (mode: 'write' | 'preview') => void
  mode: 'write' | 'preview'
  setMode: (mode: 'write' | 'preview') => void
  placeholder?: string
  required?: boolean
  /** bg/border/focus-within classes shared by the textarea surface and the preview surface */
  surfaceClassName: string
  mentionClassName?: string
  minHeightClassName?: string
  writeLabel: string
  previewLabel: string
  emptyPreviewLabel: string
}

// Write/Preview toggle over a plain textarea — same pattern as GitHub's
// comment box. Kept as its own component because both the ticket reply
// composer and the internal-ticket description field need it.
export const MarkdownEditor = forwardRef<HTMLTextAreaElement, MarkdownEditorProps>(
  function MarkdownEditor(
    {
      value,
      onChange,
      onKeyDown,
      onModeChange,
      mode,
      setMode,
      placeholder,
      required,
      surfaceClassName,
      mentionClassName,
      minHeightClassName = 'min-h-[130px]',
      writeLabel,
      previewLabel,
      emptyPreviewLabel,
    },
    ref,
  ) {
    const switchMode = (next: 'write' | 'preview') => {
      setMode(next)
      onModeChange?.(next)
    }

    return (
      <div className="flex flex-col h-full">
        <div className="flex gap-1 mb-1.5">
          <button
            type="button"
            onClick={() => switchMode('write')}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors ${
              mode === 'write' ? 'text-slate-200 bg-white/10' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {writeLabel}
          </button>
          <button
            type="button"
            onClick={() => switchMode('preview')}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors ${
              mode === 'preview' ? 'text-slate-200 bg-white/10' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {previewLabel}
          </button>
        </div>

        <div className={`flex-1 flex rounded-lg transition-colors ${minHeightClassName} ${surfaceClassName}`}>
          {mode === 'write' ? (
            <textarea
              ref={ref}
              value={value}
              onChange={onChange}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              required={required}
              className="flex-1 w-full bg-transparent px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none"
            />
          ) : (
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {value.trim() ? (
                <Markdown className="text-sm text-slate-200" mentionClassName={mentionClassName}>
                  {value}
                </Markdown>
              ) : (
                <p className="text-xs text-slate-600 italic">{emptyPreviewLabel}</p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  },
)
