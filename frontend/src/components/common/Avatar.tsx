const COLORS = [
  'bg-violet-600',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
]

function colorFor(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return COLORS[Math.abs(hash) % COLORS.length]
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

const SIZE_MAP = {
  xs: { outer: 'w-6 h-6', text: 'text-[9px]' },
  sm: { outer: 'w-7 h-7', text: 'text-[10px]' },
  md: { outer: 'w-8 h-8', text: 'text-xs' },
  lg: { outer: 'w-16 h-16', text: 'text-xl' },
  xl: { outer: 'w-24 h-24', text: 'text-3xl' },
}

interface AvatarProps {
  name: string
  avatar?: string | null
  size?: keyof typeof SIZE_MAP
  className?: string
}

export function Avatar({ name, avatar, size = 'md', className = '' }: AvatarProps) {
  const { outer, text } = SIZE_MAP[size]
  const base = `${outer} rounded-full shrink-0 overflow-hidden ${className}`

  if (avatar) {
    return (
      <img
        src={`/media/avatars/${avatar}`}
        alt={name}
        className={`${base} object-cover`}
      />
    )
  }

  return (
    <div className={`${base} ${colorFor(name)} flex items-center justify-center`}>
      <span className={`${text} font-semibold text-white leading-none select-none`}>
        {initials(name)}
      </span>
    </div>
  )
}
