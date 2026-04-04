import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useSlaSettings,
  useUpdateBusinessHours,
  useUpdateSlaPolicy,
  useCreateHoliday,
  useDeleteHoliday,
} from '../../hooks/useSlaSettings'
import { inputCls, Modal, Field, FormError, ModalActions } from './shared'

const DAYS = [
  { iso: 1, label: 'Seg' },
  { iso: 2, label: 'Ter' },
  { iso: 3, label: 'Qua' },
  { iso: 4, label: 'Qui' },
  { iso: 5, label: 'Sex' },
  { iso: 6, label: 'Sáb' },
  { iso: 7, label: 'Dom' },
]

function HolidaysSection({ holidays }: { holidays: any[] }) {
  const { t } = useTranslation()
  const deleteHoliday = useDeleteHoliday()
  const [showModal, setShowModal] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-300">{t('settings.sla.holidays.title')}</h3>
        <button
          onClick={() => setShowModal(true)}
          className="text-xs font-semibold px-3 py-1 rounded bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors"
        >
          {t('settings.sla.holidays.new')}
        </button>
      </div>

      {!holidays.length ? (
        <p className="text-xs text-slate-500 italic">{t('settings.sla.holidays.empty')}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
              <th className="pb-2 font-medium">{t('settings.sla.holidays.colDate')}</th>
              <th className="pb-2 font-medium">{t('settings.sla.holidays.colDescription')}</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {holidays.map((h) => (
              <tr key={h.id} className="border-b border-slate-800">
                <td className="py-2.5 text-slate-200 font-mono text-xs">
                  {new Date(h.date + 'T00:00:00').toLocaleDateString()}
                </td>
                <td className="py-2.5 text-slate-400 text-xs">{h.description}</td>
                <td className="py-2.5 text-right">
                  <button
                    disabled={deleteHoliday.isPending}
                    onClick={() => deleteHoliday.mutate(h.id)}
                    className="text-xs text-red-500/70 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {t('settings.sla.holidays.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && <CreateHolidayModal onClose={() => setShowModal(false)} />}
    </div>
  )
}

function CreateHolidayModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const { mutate, isPending, error } = useCreateHoliday()
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')

  return (
    <Modal title={t('settings.sla.holidays.modalTitle')} onClose={onClose}>
      <form
        onSubmit={(e) => { e.preventDefault(); mutate({ date, description }, { onSuccess: onClose }) }}
        className="space-y-4"
      >
        <Field label={t('settings.sla.holidays.fieldDate')}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputCls} />
        </Field>
        <Field label={t('settings.sla.holidays.fieldDescription')}>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required className={inputCls} placeholder="Ex: Natal" />
        </Field>
        <FormError error={error} fallback={t('settings.users.errorGeneric')} />
        <ModalActions onClose={onClose} isPending={isPending} submitLabel={t('settings.sla.holidays.create')} pendingLabel={t('settings.sla.holidays.creating')} />
      </form>
    </Modal>
  )
}

export function SlaTab() {
  const { t } = useTranslation()
  const { data, isLoading } = useSlaSettings()
  const updateBH = useUpdateBusinessHours()
  const updatePolicy = useUpdateSlaPolicy()

  const [workDays, setWorkDays] = useState<number[]>([])
  const [workStart, setWorkStart] = useState('')
  const [workEnd, setWorkEnd] = useState('')
  const [lunchStart, setLunchStart] = useState('')
  const [lunchEnd, setLunchEnd] = useState('')
  const [timezone, setTimezone] = useState('')
  const [bhDirty, setBhDirty] = useState(false)
  const [bhSaved, setBhSaved] = useState(false)

  const [editingPolicy, setEditingPolicy] = useState<string | null>(null)
  const [editingHours, setEditingHours] = useState('')

  useEffect(() => {
    if (!data) return
    const bh = data.business_hours
    setWorkDays(bh.work_days)
    setWorkStart(bh.work_start)
    setWorkEnd(bh.work_end)
    setLunchStart(bh.lunch_start ?? '')
    setLunchEnd(bh.lunch_end ?? '')
    setTimezone(bh.timezone)
    setBhDirty(false)
  }, [data])

  const handleDayToggle = (iso: number) => {
    setWorkDays((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort(),
    )
    setBhDirty(true)
  }

  const handleBhSave = () => {
    updateBH.mutate(
      { work_days: workDays, work_start: workStart, work_end: workEnd, lunch_start: lunchStart || null, lunch_end: lunchEnd || null, timezone },
      {
        onSuccess: () => {
          setBhDirty(false)
          setBhSaved(true)
          setTimeout(() => setBhSaved(false), 2000)
        },
      },
    )
  }

  const handlePolicySave = (priority: string) => {
    const hours = parseInt(editingHours, 10)
    if (!hours || hours < 1) return
    updatePolicy.mutate({ priority, resolution_hours: hours }, { onSuccess: () => setEditingPolicy(null) })
  }

  if (isLoading) {
    return (
      <section>
        <h2 className="text-base font-semibold text-slate-200 mb-4">{t('settings.sla.title')}</h2>
        <p className="text-sm text-slate-500">{t('inbox.loading')}</p>
      </section>
    )
  }

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-slate-200">{t('settings.sla.title')}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{t('settings.sla.subtitle')}</p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-3">{t('settings.sla.businessHours.title')}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-500 mb-2">{t('settings.sla.businessHours.workDays')}</label>
            <div className="flex gap-2">
              {DAYS.map(({ iso, label }) => (
                <button
                  key={iso}
                  onClick={() => handleDayToggle(iso)}
                  className={`text-xs font-medium px-2.5 py-1 rounded border transition-colors ${
                    workDays.includes(iso)
                      ? 'bg-brand-accent/20 border-brand-accent/50 text-brand-accent'
                      : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('settings.sla.businessHours.workStart')}</label>
              <input type="time" value={workStart} onChange={(e) => { setWorkStart(e.target.value); setBhDirty(true) }} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('settings.sla.businessHours.workEnd')}</label>
              <input type="time" value={workEnd} onChange={(e) => { setWorkEnd(e.target.value); setBhDirty(true) }} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('settings.sla.businessHours.lunchStart')}</label>
              <input type="time" value={lunchStart} onChange={(e) => { setLunchStart(e.target.value); setBhDirty(true) }} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('settings.sla.businessHours.lunchEnd')}</label>
              <input type="time" value={lunchEnd} onChange={(e) => { setLunchEnd(e.target.value); setBhDirty(true) }} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">{t('settings.sla.businessHours.timezone')}</label>
            <input type="text" value={timezone} onChange={(e) => { setTimezone(e.target.value); setBhDirty(true) }} placeholder="America/Sao_Paulo" className={`${inputCls} font-mono`} />
            <p className="text-xs text-slate-600 mt-1">{t('settings.sla.businessHours.timezoneHint')}</p>
          </div>

          <button
            onClick={handleBhSave}
            disabled={!bhDirty || updateBH.isPending}
            className="px-3 py-1.5 text-sm rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 disabled:opacity-40 transition-colors"
          >
            {updateBH.isPending ? t('settings.sla.businessHours.saving') : bhSaved ? t('settings.sla.businessHours.saved') : t('settings.sla.businessHours.save')}
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-3">{t('settings.sla.policies.title')}</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
              <th className="pb-2 font-medium">{t('settings.sla.policies.colPriority')}</th>
              <th className="pb-2 font-medium">{t('settings.sla.policies.colHours')}</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(data?.policies ?? []).map((policy) => (
              <tr key={policy.priority} className="border-b border-slate-800">
                <td className="py-2.5 text-slate-200">{t(`priority.${policy.priority.toUpperCase()}`)}</td>
                <td className="py-2.5">
                  {editingPolicy === policy.priority ? (
                    <input
                      type="number"
                      min={1}
                      value={editingHours}
                      onChange={(e) => setEditingHours(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handlePolicySave(policy.priority)
                        if (e.key === 'Escape') setEditingPolicy(null)
                      }}
                      autoFocus
                      className="w-20 bg-slate-800 border border-brand-accent/50 rounded px-2 py-0.5 text-sm text-slate-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  ) : (
                    <span className="text-slate-300 font-mono">{policy.resolution_hours}h</span>
                  )}
                </td>
                <td className="py-2.5 text-right">
                  {editingPolicy === policy.priority ? (
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => handlePolicySave(policy.priority)} disabled={updatePolicy.isPending} className="text-xs text-brand-accent hover:text-white transition-colors disabled:opacity-50">
                        {t('settings.sla.policies.save')}
                      </button>
                      <button onClick={() => setEditingPolicy(null)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                        {t('settings.sla.policies.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingPolicy(policy.priority); setEditingHours(String(policy.resolution_hours)) }}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {t('settings.sla.policies.edit')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-brand-border/30 pt-8">
        <HolidaysSection holidays={data?.holidays ?? []} />
      </div>
    </section>
  )
}
