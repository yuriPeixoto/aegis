import { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateSavedView, type ViewFilters } from '../../hooks/useSavedViews'
import { useMe } from '../../hooks/useAuth'

const ICON_OPTIONS = ['📋', '🔥', '👤', '⚡', '🎯', '📌', '🛑', '✅', '🔔', '🚨']

interface Props {
  filters: ViewFilters
  onClose: () => void
}

export function SaveViewModal({ filters, onClose }: Props) {
  const { data: me } = useMe()
  const create = useCreateSavedView()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📋')
  const [isShared, setIsShared] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    create.mutate(
      { name, icon, is_shared: isShared, filters },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-brand-surface border border-brand-border rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <header className="px-5 py-4 border-b border-brand-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Salvar vista</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Icon picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setIcon(opt)}
                  className={`w-8 h-8 text-base rounded-md border transition-colors ${
                    icon === opt
                      ? 'border-brand-accent bg-brand-accent/20'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome</label>
            <input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Urgentes sem dono"
              className="w-full bg-black/20 border border-brand-border rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-accent transition-colors"
            />
          </div>

          {/* Shared toggle (admin only) */}
          {me?.role === 'admin' && (
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-brand-accent focus:ring-brand-accent"
              />
              <span className="text-sm text-slate-300">Compartilhar com a equipe</span>
            </label>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={create.isPending || !name.trim()}
              className="px-4 py-1.5 text-sm rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 disabled:opacity-50 transition-colors"
            >
              {create.isPending ? 'Salvando...' : 'Salvar vista'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
