import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface FilterSelectProps {
  value: string | undefined
  onChange: (v: string) => void
  placeholder: string
  options: Option[]
  minWidth?: string
}

export function FilterSelect({ value, onChange, placeholder, options, minWidth }: FilterSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(val: string) {
    onChange(val)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={minWidth ? { minWidth } : undefined}
        className={`flex items-center justify-between gap-2 px-4 py-2 rounded-lg text-sm font-medium text-left
          border transition-all duration-200 cursor-pointer whitespace-nowrap w-full
          focus:outline-none focus:ring-2 focus:ring-brand-purple/40
          ${open
            ? 'bg-brand-purple/15 border-brand-purple/50 text-slate-200'
            : selected
              ? 'bg-brand-surface border-brand-purple/40 text-slate-200'
              : 'bg-brand-surface/60 border-brand-border text-slate-400 hover:border-slate-500 hover:text-slate-300'
          }`}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-brand-purple' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 min-w-full z-50
            bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-xl
            shadow-xl shadow-black/40 overflow-hidden"
          style={{ minWidth: '160px', animation: 'dropdown-in 150ms ease-out' }}
        >
          {/* Clear option */}
          <button
            type="button"
            onClick={() => handleSelect('')}
            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors duration-150 cursor-pointer
              ${!value
                ? 'text-brand-purple bg-brand-purple/10'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
          >
            <span>{placeholder}</span>
            {!value && <Check className="w-3.5 h-3.5" />}
          </button>

          <div className="border-t border-white/5" />

          {/* Options */}
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => handleSelect(o.value)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors duration-150 cursor-pointer
                ${o.value === value
                  ? 'text-brand-purple bg-brand-purple/10 font-medium'
                  : 'text-slate-300 hover:text-slate-100 hover:bg-white/5'
                }`}
            >
              <span>{o.label}</span>
              {o.value === value && <Check className="w-3.5 h-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
