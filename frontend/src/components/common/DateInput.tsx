import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  value: string      // YYYY-MM-DD
  min?: string
  max?: string
  onChange: (value: string) => void
}

function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getWeekdayHeaders(locale: string): string[] {
  // Generate abbreviated weekday names starting from Sunday
  const base = new Date(2023, 0, 1) // Sunday Jan 1 2023
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(1 + i)
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d)
  })
}

function formatDisplay(isoDate: string, locale: string): string {
  return parseISO(isoDate).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatHeader(year: number, month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(year, month, 1),
  )
}

export function DateInput({ value, min, max, onChange }: Props) {
  const { i18n } = useTranslation()
  const locale = i18n.language
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => parseISO(value).getFullYear())
  const [viewMonth, setViewMonth] = useState(() => parseISO(value).getMonth())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  function openCalendar() {
    const d = parseISO(value)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
    setOpen(true)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function selectDay(day: number) {
    const iso = toISO(new Date(viewYear, viewMonth, day))
    if (min && iso < min) return
    if (max && iso > max) return
    onChange(iso)
    setOpen(false)
  }

  const selectedISO = value
  const todayISO = toISO(new Date())
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay() // 0 = Sun
  const totalDays = daysInMonth(viewYear, viewMonth)
  const weekdays = getWeekdayHeaders(locale)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={openCalendar}
        className="bg-white/5 border border-brand-border rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500 hover:border-slate-600 transition-colors min-w-[90px] text-left"
      >
        {formatDisplay(value, locale)}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-brand-dark border border-brand-border rounded-xl shadow-xl p-3 w-60 select-none">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-semibold text-slate-200 capitalize">
              {formatHeader(viewYear, viewMonth, locale)}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {weekdays.map((wd) => (
              <div key={wd} className="text-center text-[10px] text-slate-600 font-medium py-0.5 capitalize">
                {wd.charAt(0).toUpperCase() + wd.slice(1, 2)}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {/* Empty cells before first day */}
            {Array.from({ length: firstWeekday }, (_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: totalDays }, (_, i) => {
              const day = i + 1
              const iso = toISO(new Date(viewYear, viewMonth, day))
              const isSelected = iso === selectedISO
              const isToday = iso === todayISO
              const isDisabled = (min != null && iso < min) || (max != null && iso > max)
              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => selectDay(day)}
                  className={`
                    text-[11px] h-7 w-full rounded transition-colors
                    ${isDisabled ? 'text-slate-700 cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer'}
                    ${isSelected ? 'bg-violet-600 text-white hover:bg-violet-500' : ''}
                    ${isToday && !isSelected ? 'text-violet-400 font-semibold' : ''}
                    ${!isSelected && !isToday && !isDisabled ? 'text-slate-300' : ''}
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
