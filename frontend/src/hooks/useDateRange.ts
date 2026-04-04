import { useState } from 'react'
import type { Granularity } from './useAnalytics'

// ── Helpers ──────────────────────────────────────────────────────────────────

export function toDateString(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function today(): string {
  return toDateString(new Date())
}

export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toDateString(d)
}

export function diffDays(from: string, to: string): number {
  return Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000,
  )
}

export function autoGranularity(from: string, to: string): Granularity {
  const diff = diffDays(from, to)
  if (diff <= 14) return 'day'
  if (diff <= 91) return 'week'
  return 'month'
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface DateRange {
  from: string
  to: string
  granularity: Granularity
}

export function useDateRange(defaultDays = 30): DateRange & {
  setFrom: (v: string) => void
  setTo: (v: string) => void
} {
  const [from, setFrom] = useState(() => daysAgo(defaultDays))
  const [to, setTo] = useState(() => today())

  return {
    from,
    to,
    granularity: autoGranularity(from, to),
    setFrom,
    setTo,
  }
}
