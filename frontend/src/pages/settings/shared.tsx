import { useTranslation } from 'react-i18next'

export const inputCls =
  'w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-accent'

export function Modal({
  title,
  onClose: _onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-slate-200 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

export function RoleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation()
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      <option value="agent">{t('settings.users.role.agent')}</option>
      <option value="admin">{t('settings.users.role.admin')}</option>
      <option value="viewer">{t('settings.users.role.viewer')}</option>
    </select>
  )
}

export function FormError({ error, fallback }: { error: unknown; fallback: string }) {
  if (!error) return null
  const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  return <p className="text-xs text-red-400">{detail ?? fallback}</p>
}

export function ModalActions({
  onClose,
  isPending,
  submitLabel,
  pendingLabel,
}: {
  onClose: () => void
  isPending: boolean
  submitLabel: string
  pendingLabel: string
}) {
  const { t } = useTranslation()
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
        {t('settings.sources.cancel')}
      </button>
      <button
        type="submit"
        disabled={isPending}
        className="px-3 py-1.5 text-sm rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 disabled:opacity-50 transition-colors"
      >
        {isPending ? pendingLabel : submitLabel}
      </button>
    </div>
  )
}
