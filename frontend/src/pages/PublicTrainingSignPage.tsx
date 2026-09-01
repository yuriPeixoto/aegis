import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Zap, CheckCircle2, AlertCircle } from 'lucide-react'
import { usePublicTrainingSummary, usePublicSign } from '../hooks/useTrainingRecords'
import { SignatureCanvas, type SignatureCanvasHandle } from '../components/common/SignatureCanvas'
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher'

const MODALITY_LABEL_KEY: Record<string, string> = {
  presencial: 'training.modality.presencial',
  remoto: 'training.modality.remoto',
}

function formatDate(iso: string, locale: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function PublicTrainingSignPage() {
  const { t, i18n } = useTranslation()
  const { token = '' } = useParams<{ token: string }>()
  const { data: summary, isLoading, isError } = usePublicTrainingSummary(token)
  const { mutate: sign, isPending, isError: signError } = usePublicSign(token)

  const [name, setName] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [sector, setSector] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const signatureRef = useRef<SignatureCanvasHandle>(null)
  const [submitted, setSubmitted] = useState(false)

  if (summary && !initialized) {
    setName(summary.participant_name)
    setRoleTitle(summary.participant_role_title ?? '')
    setSector(summary.participant_sector ?? '')
    setInitialized(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const signatureData = signatureRef.current?.toDataUrl()
    if (!signatureData || !confirmed || !name.trim()) return
    sign(
      {
        name: name.trim(),
        role_title: roleTitle.trim() || null,
        sector: sector.trim() || null,
        confirmed_understanding: confirmed,
        signature_data: signatureData,
      },
      { onSuccess: () => setSubmitted(true) },
    )
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#7C3AED 1px, transparent 1px), linear-gradient(90deg, #7C3AED 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative w-full max-w-lg">
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-14 h-14 rounded-2xl bg-brand-purple/20 border border-brand-purple/30 flex items-center justify-center mb-3"
            style={{ boxShadow: '0 0 32px rgba(124, 58, 237, 0.15)' }}
          >
            <Zap className="w-7 h-7 text-brand-neon" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-slate-100">Ae</span>
            <span className="text-brand-purple">gis</span>
          </h1>
        </div>

        <div className="glass-card p-6 sm:p-8">
          {isLoading && (
            <p className="text-sm text-slate-400 text-center py-8">{t('training.public.loading')}</p>
          )}

          {isError && (
            <div className="text-center py-8 space-y-2">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
              <p className="text-sm text-slate-300">{t('training.public.notFound')}</p>
            </div>
          )}

          {summary && !submitted && !summary.already_signed && (
            <>
              <h2 className="text-lg font-semibold text-slate-100 mb-1">{summary.training_name}</h2>
              <p className="text-xs text-slate-400 mb-4">
                {summary.system_module} — {formatDate(summary.training_date, i18n.language)}
                {summary.start_time && ` · ${summary.start_time}${summary.end_time ? ` às ${summary.end_time}` : ''}`}
                {' · '}
                {t(MODALITY_LABEL_KEY[summary.modality] ?? 'training.modality.presencial')}
              </p>
              <p className="text-xs text-slate-500 mb-6">
                {t('training.public.instructor')}: <span className="text-slate-300">{summary.instructor_name}</span>
                {summary.source_name && <> · {summary.source_name}</>}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 font-semibold mb-2">
                    {t('training.public.nameLabel')}
                  </label>
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-300 font-semibold mb-2">
                      {t('training.public.roleLabel')}
                    </label>
                    <input
                      className="input"
                      value={roleTitle}
                      onChange={(e) => setRoleTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 font-semibold mb-2">
                      {t('training.public.sectorLabel')}
                    </label>
                    <input
                      className="input"
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 font-semibold mb-2">
                    {t('training.public.signatureLabel')}
                  </label>
                  <SignatureCanvas ref={signatureRef} />
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-brand-border bg-slate-800/50 text-brand-purple accent-brand-purple cursor-pointer"
                  />
                  <span className="text-sm text-slate-300">{t('training.public.confirmText')}</span>
                </label>

                {signError && (
                  <p className="text-xs text-red-400 font-mono bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                    {t('training.public.submitError')}
                  </p>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={isPending || !confirmed || !name.trim()}
                >
                  {isPending ? t('training.public.submitting') : t('training.public.submit')}
                </button>
              </form>
            </>
          )}

          {summary && (submitted || summary.already_signed) && (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <p className="text-sm text-slate-200 font-semibold">{t('training.public.alreadySignedTitle')}</p>
              <p className="text-xs text-slate-500">{t('training.public.alreadySignedBody')}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4 px-1">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  )
}
