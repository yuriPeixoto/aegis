import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAutoCloseSettings, useUpdateAutoCloseSettings } from '../../hooks/useAutoCloseSettings'
import { inputCls } from './shared'

export function AutoCloseTab() {
  const { t } = useTranslation()
  const { data: settings, isLoading } = useAutoCloseSettings()
  const updateSettings = useUpdateAutoCloseSettings()
  const [form, setForm] = useState({
    enabled: false,
    wait_days: 5,
    warning_days: 3,
    close_message: '',
    warning_message: '',
  })
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setForm({
        enabled: settings.enabled,
        wait_days: settings.wait_days,
        warning_days: settings.warning_days,
        close_message: settings.close_message,
        warning_message: settings.warning_message,
      })
    }
  }, [settings])

  if (isLoading || !settings) return <p className="text-sm text-slate-500">{t('inbox.loading')}</p>

  const handleSave = () => {
    updateSettings.mutate(form, {
      onSuccess: () => {
        setShowSaved(true)
        setTimeout(() => setShowSaved(false), 3000)
      },
    })
  }

  return (
    <section className="max-w-2xl pb-10">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-slate-200">{t('settings.sla.autoClose.title')}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{t('settings.sla.autoClose.subtitle')}</p>
      </div>

      <div className="space-y-6">
        <label className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/8 transition-colors">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-brand-accent focus:ring-brand-accent focus:ring-offset-slate-900"
          />
          <div>
            <p className="text-sm font-medium text-slate-200">{t('settings.sla.autoClose.enabled')}</p>
          </div>
        </label>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">{t('settings.sla.autoClose.waitDays')}</label>
            <input
              type="number"
              value={form.wait_days}
              onChange={(e) => setForm({ ...form, wait_days: parseInt(e.target.value) || 0 })}
              className={`${inputCls} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            />
            <p className="text-[10px] text-slate-500">{t('settings.sla.autoClose.waitDaysHint')}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">{t('settings.sla.autoClose.warningDays')}</label>
            <input
              type="number"
              value={form.warning_days}
              onChange={(e) => setForm({ ...form, warning_days: parseInt(e.target.value) || 0 })}
              className={`${inputCls} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            />
            <p className="text-[10px] text-slate-500">{t('settings.sla.autoClose.warningDaysHint')}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">{t('settings.sla.autoClose.warningMessage')}</label>
          <textarea
            value={form.warning_message}
            onChange={(e) => setForm({ ...form, warning_message: e.target.value })}
            rows={3}
            className={`${inputCls} resize-none`}
          />
          <p className="text-[10px] text-slate-500">{t('settings.sla.autoClose.warningMessageHint')}</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">{t('settings.sla.autoClose.closeMessage')}</label>
          <textarea
            value={form.close_message}
            onChange={(e) => setForm({ ...form, close_message: e.target.value })}
            rows={3}
            className={`${inputCls} resize-none`}
          />
          <p className="text-[10px] text-slate-500">{t('settings.sla.autoClose.closeMessageHint')}</p>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="px-4 py-2 bg-brand-accent text-white text-sm font-medium rounded-md hover:bg-brand-accent/90 disabled:opacity-50 transition-colors"
          >
            {updateSettings.isPending ? t('settings.sla.autoClose.saving') : t('settings.sla.autoClose.save')}
          </button>
          {showSaved && (
            <span className="text-sm text-emerald-400 animate-in fade-in slide-in-from-left-2">
              {t('settings.sla.autoClose.saved')}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
