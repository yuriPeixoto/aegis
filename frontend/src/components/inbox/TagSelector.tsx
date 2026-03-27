import { useState, useRef, useEffect } from 'react'
import { Plus, X, Tag as TagIcon, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTags, useUpdateTicketTags } from '../../hooks/useTickets'
import { Tag } from '../../types/ticket'
import TagBadge from './TagBadge'

interface TagSelectorProps {
  ticketId: number
  currentTags: Tag[]
}

export default function TagSelector({ ticketId, currentTags }: TagSelectorProps) {
  const { t } = useTranslation()
  const { data: allTags = [] } = useTags()
  const updateTags = useUpdateTicketTags(ticketId)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleTag = (tagId: number) => {
    const isSelected = currentTags.some((t) => t.id === tagId)
    const newTagIds = isSelected
      ? currentTags.filter((t) => t.id !== tagId).map((t) => t.id)
      : [...currentTags.map((t) => t.id), tagId]
    
    updateTags.mutate(newTagIds)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex flex-wrap gap-1.5 items-center">
        {currentTags && Array.isArray(currentTags) && currentTags.map((tag) => (
          <div key={tag.id} className="group relative">
            <TagBadge tag={tag} />
            <button
              onClick={() => toggleTag(tag.id)}
              className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <X className="w-2 h-2" />
            </button>
          </div>
        ))}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Plus className="w-2.5 h-2.5" />
          {t('inbox.detail.addTag')}
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-brand-surface border border-brand-border rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="p-2 border-b border-brand-border bg-white/5 flex items-center gap-2">
            <TagIcon className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('settings.tags.title')}
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {allTags.length === 0 ? (
              <div className="p-3 text-center">
                <p className="text-[10px] text-slate-500">{t('inbox.detail.noTagsFound')}</p>
              </div>
            ) : (
              allTags.map((tag) => {
                const isSelected = currentTags.some((t) => t.id === tag.id)
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-xs text-slate-300 group-hover:text-white">
                        {tag.name}
                      </span>
                    </div>
                    {isSelected && <Check className="w-3 h-3 text-brand-purple" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
