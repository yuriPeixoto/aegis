import { useDraggable } from '@dnd-kit/core'
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
  const taskColor = isTask ? taskDisplayColor(event) : null

  return (
    <button
      ref={draggable ? setNodeRef : undefined}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
      onClick={(e) => onClick(event, e)}
      className={`text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate overflow-hidden ${
        isTask ? 'border' : EVENT_COLORS[event.type as CalendarEventType]
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'opacity-30' : ''} ${className ?? ''}`}
      style={{
        ...(taskColor
          ? { backgroundColor: `${taskColor}33`, color: taskColor, borderColor: `${taskColor}66` }
          : {}),
        ...style,
      }}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${!isTask ? DOT_COLORS[event.type as CalendarEventType] : ''}`}
        style={taskColor ? { backgroundColor: taskColor } : undefined}
      />
      {eventLabel(event, t)}
    </button>
  )
}
