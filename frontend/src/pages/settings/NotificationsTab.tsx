import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getNotifPrefs, setNotifPref } from '../../hooks/useInboundNotifications'

export function NotificationsTab() {
  const { t } = useTranslation()
  const prefs = getNotifPrefs()
  const [os, setOs] = useState(prefs.os)
  const [badge, setBadge] = useState(prefs.badge)
  const [sound, setSound] = useState(prefs.sound)

  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied',
  )

  function toggle(key: 'os' | 'badge' | 'sound', value: boolean) {
    setNotifPref(key, value)
    if (key === 'os') setOs(value)
    if (key === 'badge') setBadge(value)
    if (key === 'sound') setSound(value)
  }

  async function requestPermission() {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission()
    setPermission(result)
  }

  const permissionLabel =
    permission === 'granted'
      ? t('settings.notifications.permissionGranted')
      : permission === 'denied'
        ? t('settings.notifications.permissionDenied')
        : t('settings.notifications.permissionPending')

  const permissionColor =
    permission === 'granted'
      ? 'text-emerald-400'
      : permission === 'denied'
        ? 'text-red-400'
        : 'text-amber-400'

  const rows: { key: 'os' | 'badge' | 'sound'; label: string; hint: string; value: boolean }[] = [
    { key: 'os',    label: t('settings.notifications.osLabel'),    hint: t('settings.notifications.osHint'),    value: os    },
    { key: 'badge', label: t('settings.notifications.badgeLabel'), hint: t('settings.notifications.badgeHint'), value: badge },
    { key: 'sound', label: t('settings.notifications.soundLabel'), hint: t('settings.notifications.soundHint'), value: sound },
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-base font-semibold text-slate-200">{t('settings.notifications.title')}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{t('settings.notifications.subtitle')}</p>
      </div>

      {'Notification' in window && (
        <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-brand-border rounded-lg">
          <div>
            <p className="text-sm text-slate-300">Browser permission</p>
            <p className={`text-xs mt-0.5 ${permissionColor}`}>{permissionLabel}</p>
          </div>
          {permission !== 'granted' && permission !== 'denied' && (
            <button
              onClick={requestPermission}
              className="px-3 py-1.5 text-xs rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors"
            >
              {t('settings.notifications.requestPermission')}
            </button>
          )}
        </div>
      )}

      <div className="divide-y divide-brand-border border border-brand-border rounded-lg overflow-hidden">
        {rows.map(({ key, label, hint, value }) => (
          <div key={key} className="flex items-start justify-between gap-4 px-4 py-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
            </div>
            <button
              type="button"
              onClick={() => toggle(key, !value)}
              className={`mt-0.5 relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${value ? 'bg-purple-600' : 'bg-slate-600'}`}
            >
              <span
                className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
