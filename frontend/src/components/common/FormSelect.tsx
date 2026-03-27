import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface FormSelectProps {
  value: string
  onChange: (v: string) => void
  label?: string
  options: Option[]
  placeholder?: string
  className?: string
}

export function FormSelect({ value, onChange, label, options, placeholder, className = '' }: FormSelectProps) {
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
    <div ref={ref} className={`relative flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium text-left
            border transition-all duration-200 cursor-pointer whitespace-nowrap w-full
            focus:outline-none focus:ring-2 focus:ring-brand-purple/40
            ${open
              ? 'bg-brand-purple/10 border-brand-purple/50 text-slate-100'
              : 'bg-slate-800/50 border-brand-border text-slate-200 hover:border-slate-500'
            }`}
        >
          <span className="truncate">{selected ? selected.label : placeholder || 'Selecione...'}</span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-brand-purple' : 'text-slate-500'}`}
          />
        </button>

        {open && (
          <div
            className="absolute top-full left-0 mt-1.5 w-full z-50
              bg-slate-800 border border-brand-border rounded-xl
              shadow-xl shadow-black/50 overflow-hidden max-h-60 overflow-y-auto"
            style={{ animation: 'dropdown-in 150ms ease-out' }}
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleSelect(o.value)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors duration-150 cursor-pointer
                  ${o.value === value
                    ? 'text-brand-purple bg-brand-purple/10 font-medium'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-white/5'
                  }`}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
