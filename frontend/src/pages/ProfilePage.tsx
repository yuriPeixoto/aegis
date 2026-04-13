import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, CalendarDays, BookOpen } from 'lucide-react'
import { useMe, useUpdateProfile } from '../hooks/useAuth'
import { Avatar } from '../components/common/Avatar'
import { api } from '../lib/axios'
import { useCalendarEvents } from '../hooks/useCalendar'

export function ProfilePage() {
  const { t, i18n } = useTranslation()
  const { data: user } = useMe()
  const updateProfile = useUpdateProfile()

  // Profile form state
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Password form state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setProfileError('')
    setProfileSaved(false)

    const formData = new FormData()
    if (name !== user?.name) formData.append('name', name)
    if (email !== user?.email) formData.append('email', email)
    if (avatarFile) formData.append('avatar', avatarFile)

    // Nothing changed
    if ([...formData.entries()].length === 0) return

    try {
      await updateProfile.mutateAsync(formData)
      setAvatarFile(null)
      setAvatarPreview(null)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch {
      setProfileError(t('profile.errorGeneric'))
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSaved(false)

    if (newPassword !== confirmPassword) {
      setPasswordError(t('changePassword.mismatch'))
      return
    }
    if (newPassword.length < 8) {
      setPasswordError(t('profile.passwordTooShort'))
      return
    }

    setPasswordSaving(true)
    try {
      await api.post('/auth/change-password', { new_password: newPassword })
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSaved(true)
      setTimeout(() => setPasswordSaved(false), 3000)
    } catch {
      setPasswordError(t('profile.errorGeneric'))
    } finally {
      setPasswordSaving(false)
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const { data: calendarEvents = [] } = useCalendarEvents(
    user ? { agent_id: user.id, from_date: today } : {}
  )
  const onCallEvents   = calendarEvents.filter((e) => e.type === 'on_call').slice(0, 5)
  const trainingEvents = calendarEvents.filter((e) => e.type === 'training').slice(0, 5)

  function fmtDate(s: string) {
    return new Date(s + 'T00:00:00').toLocaleDateString(i18n.language, {
      weekday: 'short', day: 'numeric', month: 'short',
    })
  }

  const displayAvatar = avatarPreview
    ? null // will use img src directly for preview
    : user?.avatar ?? null

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Avatar + Profile Info */}
      <div className="bg-white/[0.03] border border-brand-border rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-slate-200 mb-6">{t('profile.title')}</h2>

        {/* Avatar picker */}
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={user?.name}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <Avatar name={user?.name ?? ''} avatar={displayAvatar} size="xl" />
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-dark border border-brand-border flex items-center justify-center hover:bg-white/10 transition-colors"
              title={t('profile.changeAvatar')}
            >
              <Camera className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">{user?.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
            <p className="text-xs text-slate-600 mt-1">{t(`settings.users.role.${user?.role}`)}</p>
          </div>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('settings.users.fieldName')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-brand-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('settings.users.fieldEmail')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-brand-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
              required
            />
          </div>

          {profileError && <p className="text-xs text-rose-400">{profileError}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm font-medium text-white transition-colors"
            >
              {updateProfile.isPending ? t('common.saving') : t('common.save')}
            </button>
            {profileSaved && <span className="text-xs text-emerald-400">{t('profile.saved')}</span>}
          </div>
        </form>
      </div>

      {/* Agenda */}
      {(onCallEvents.length > 0 || trainingEvents.length > 0) && (
        <div className="bg-white/[0.03] border border-brand-border rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">{t('agentProfile.upcomingAgenda')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {onCallEvents.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-300">{t('calendar.type.on_call')}</span>
                </div>
                <ul className="space-y-1.5">
                  {onCallEvents.map((ev) => (
                    <li key={ev.id} className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                      <span>{fmtDate(ev.event_date)}</span>
                      {ev.start_time && (
                        <span className="text-slate-600">{ev.start_time}{ev.end_time ? `–${ev.end_time}` : ''}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {trainingEvents.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-300">{t('calendar.type.training')}</span>
                </div>
                <ul className="space-y-1.5">
                  {trainingEvents.map((ev) => (
                    <li key={ev.id} className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span>{fmtDate(ev.event_date)}</span>
                      {ev.source && <span className="text-slate-500 truncate">— {ev.source.name}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="bg-white/[0.03] border border-brand-border rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-slate-200 mb-6">{t('profile.changePasswordTitle')}</h2>

        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('profile.newPassword')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-white/5 border border-brand-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('profile.confirmPassword')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-white/5 border border-brand-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
              autoComplete="new-password"
              required
            />
          </div>

          {passwordError && <p className="text-xs text-rose-400">{passwordError}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={passwordSaving}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm font-medium text-white transition-colors"
            >
              {passwordSaving ? t('common.saving') : t('profile.changePasswordSave')}
            </button>
            {passwordSaved && <span className="text-xs text-emerald-400">{t('profile.saved')}</span>}
          </div>
        </form>
      </div>
    </div>
  )
}
