import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, GraduationCap, CheckCircle2 } from 'lucide-react'
import { useTrainingRecords } from '../hooks/useTrainingRecords'

function formatDate(iso: string, locale: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function TrainingRecordsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data: records = [], isLoading } = useTrainingRecords()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-brand-purple" />
            {t('training.list.title')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t('training.list.subtitle')}</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => navigate('novo')}>
          <Plus className="w-4 h-4" />
          {t('training.list.new')}
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500 font-mono animate-pulse">{t('inbox.loading')}</p>
      ) : records.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <GraduationCap className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">{t('training.list.empty')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`${r.id}`)}
              className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-accent/40 rounded-xl px-5 py-4 transition-all flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate">{r.training_name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatDate(r.training_date, i18n.language)}
                  {r.source && ` · ${r.source.name}`}
                  {' · '}
                  {r.instructor.name}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-mono text-slate-400">
                  {r.signed_count}/{r.participant_count}
                </span>
                {r.status === 'completed' ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {t('training.status.completed')}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
                    {t('training.status.draft')}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
