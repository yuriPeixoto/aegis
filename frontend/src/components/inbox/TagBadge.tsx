import { Tag } from '../../types/ticket'

interface TagBadgeProps {
  tag: Tag
  className?: string
}

export default function TagBadge({ tag, className = '' }: TagBadgeProps) {
  // Use the tag's color with some transparency for the background
  const bgColor = `${tag.color}33` // 33 is ~20% opacity in hex
  const borderColor = `${tag.color}66` // 66 is ~40% opacity in hex

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border transition-colors shadow-sm ${className}`}
      style={{
        backgroundColor: bgColor,
        color: tag.color,
        borderColor: borderColor,
      }}
      title={tag.description || tag.name}
    >
      {tag.name}
    </span>
  )
}
