import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'

interface MonthDayCellProps {
  dateStr: string
  onClick: () => void
  className?: string
  children: ReactNode
}

// Célula do grid mensal, também um alvo de drop (#597) — arrastar um chip de
// evento até aqui reagenda a data (mantendo o horário).
export function MonthDayCell({ dateStr, onClick, className, children }: MonthDayCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${dateStr}` })

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`${className ?? ''} ${isOver ? 'bg-brand-accent/10 ring-1 ring-inset ring-brand-accent/50' : ''}`}
    >
      {children}
    </div>
  )
}
