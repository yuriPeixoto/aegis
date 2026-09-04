import type { CalendarEvent } from '../../types/calendar'
import { toMinutes } from './time'

export const HOURS = Array.from({ length: 24 }, (_, h) => h)
export const ROW_HEIGHT = 56 // px por hora
export const GRID_HEIGHT = HOURS.length * ROW_HEIGHT

// ISO: 1=segunda .. 7=domingo. `dateStr` é "YYYY-MM-DD".
export function isoWeekday(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const jsDay = new Date(y, m - 1, d).getDay() // 0=domingo .. 6=sábado
  return jsDay === 0 ? 7 : jsDay
}

export function formatHour(hour: number, language: string): string {
  const d = new Date(2000, 0, 1, hour, 0)
  return new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit' }).format(d)
}

export interface PositionedEvent {
  event: CalendarEvent
  top: number
  height: number
  column: number
  columns: number
}

// Agrupa eventos com horário em clusters de sobreposição e atribui coluna
// a cada um dentro do cluster (layout tipo Google Calendar, versão simples).
// Compartilhado entre DayView e WeekView (cada dia da semana roda essa
// função sobre os eventos só daquele dia).
export function layoutTimedEvents(events: CalendarEvent[]): PositionedEvent[] {
  const withSpan = events
    .filter((ev) => ev.start_time)
    .map((ev) => {
      const start = toMinutes(ev.start_time as string)
      const end = ev.end_time ? Math.max(toMinutes(ev.end_time), start + 15) : start + 30
      return { event: ev, start, end }
    })
    .sort((a, b) => a.start - b.start || a.end - b.end)

  const positioned: PositionedEvent[] = []
  let cluster: typeof withSpan = []
  let clusterEnd = -1

  function flushCluster() {
    if (cluster.length === 0) return
    // Atribuição gulosa de coluna: cada evento pega a primeira coluna livre
    const columnEnds: number[] = []
    const withColumn = cluster.map((item) => {
      let col = columnEnds.findIndex((end) => end <= item.start)
      if (col === -1) {
        col = columnEnds.length
        columnEnds.push(item.end)
      } else {
        columnEnds[col] = item.end
      }
      return { ...item, column: col }
    })
    const columns = columnEnds.length
    for (const item of withColumn) {
      positioned.push({
        event: item.event,
        top: (item.start / 60) * ROW_HEIGHT,
        height: ((item.end - item.start) / 60) * ROW_HEIGHT,
        column: item.column,
        columns,
      })
    }
    cluster = []
  }

  for (const item of withSpan) {
    if (cluster.length > 0 && item.start >= clusterEnd) {
      flushCluster()
      clusterEnd = -1
    }
    cluster.push(item)
    clusterEnd = Math.max(clusterEnd, item.end)
  }
  flushCluster()

  return positioned
}
