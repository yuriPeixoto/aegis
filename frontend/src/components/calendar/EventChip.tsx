import { useDraggable } from '@dnd-kit/core'
import { CheckCircle2, Repeat } from 'lucide-react'
import type { TFunction } from 'i18next'
import type { CSSProperties, MouseEvent } from 'react'
import type { CalendarEvent, CalendarEventType } from '../../types/calendar'
import { DOT_COLORS, EVENT_COLORS, eventLabel, taskDisplayColor } from './colors'

interface EventChipProps {
  event: CalendarEvent
  t: TFunction
  onClick: (ev: CalendarEvent, e: MouseEvent) => void
  draggable?: boolean
  className?: string
  style?: CSSProperties
}

// Chip de evento compartilhado entre o grid mensal e a view diária — visual
// idêntico nos dois, com suporte opcional a arrastar (dnd-kit) pro #597.
export function EventChip({ event, t, onClick, draggable = false, className, style }: EventChipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `event:${event.id}`,
    disabled: !draggable,
  })

  const isTask = event.type === 'task'
  const isDone = !!event.completed_at
  const isRecurring = !!event.recurrence_group_id
  const taskColor = isTask ? taskDisplayColor(event) : null

  return (
    <button
      ref={draggable ? setNodeRef : undefined}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
      onClick={(e) => onClick(event, e)}
      title={isDone ? t('calendar.completedHint') : isRecurring ? t('calendar.recurringHint') : undefined}
      className={`text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate overflow-hidden flex items-center gap-1 ${
        isTask ? 'border' : EVENT_COLORS[event.type as CalendarEventType]
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'opacity-30' : isDone ? 'opacity-50' : ''} ${className ?? ''}`}
      style={{
        ...(taskColor
          ? { backgroundColor: `${taskColor}33`, color: taskColor, borderColor: `${taskColor}66` }
          : {}),
        ...style,
      }}
    >
      {isDone ? (
        <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
      ) : isRecurring ? (
        <Repeat className="w-2.5 h-2.5 shrink-0" />
      ) : (
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${!isTask ? DOT_COLORS[event.type as CalendarEventType] : ''}`}
          style={taskColor ? { backgroundColor: taskColor } : undefined}
        />
      )}
      <span className="truncate">{eventLabel(event, t)}</span>
    </button>
  )
}
