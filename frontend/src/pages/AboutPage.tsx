import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Zap, Github, Calendar, Tag, ExternalLink, Sparkles } from 'lucide-react'
import { api } from '../lib/axios'

interface ChangelogEntry {
  version: string
  date: string
  highlights: string[]
}

interface AboutInfo {
  version: string
  build_date: string
  env: string
  github_url: string
  changelog: ChangelogEntry[]
}

function useAbout() {
  return useQuery<AboutInfo>({
    queryKey: ['about'],
    queryFn: () => api.get<AboutInfo>('/about').then((r) => r.data),
    staleTime: Infinity,
  })
}

export function AboutPage() {
  const { t } = useTranslation()
  const { data } = useAbout()

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-brand-purple/20 border border-brand-purple/30 flex items-center justify-center">
          <Zap className="w-7 h-7 text-brand-neon" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Aegis</h1>
          <p className="text-slate-400 text-sm mt-0.5">{t('about.subtitle')}</p>
        </div>
      </div>

      <div className="bg-brand-dark/50 border border-brand-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-border bg-brand-dark">
          <h2 className="font-semibold text-slate-200 uppercase tracking-wider text-xs">
            {t('about.buildInfo')}
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Tag className="w-4 h-4" />
              {t('about.version')}
            </div>
            <span className="font-mono text-sm text-brand-neon font-medium">
              {data ? `v${data.version}` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Calendar className="w-4 h-4" />
              {t('about.buildDate')}
            </div>
            <span className="font-mono text-sm text-slate-300">
              {data?.build_date ?? '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Zap className="w-4 h-4" />
              {t('about.environment')}
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              data?.env === 'production'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}>
              {data?.env ?? '—'}
            </span>
          </div>
        </div>
      </div>

      {data && data.changelog.length > 0 && (
        <div className="bg-brand-dark/50 border border-brand-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-brand-border bg-brand-dark flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-neon" />
            <h2 className="font-semibold text-slate-200 uppercase tracking-wider text-xs">
              {t('about.changelog')}
            </h2>
          </div>
          <div className="divide-y divide-brand-border/50">
            {data.changelog.map((entry) => (
              <div key={entry.version} className="px-6 py-4 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold text-brand-neon">v{entry.version}</span>
                  <span className="text-xs text-slate-500">{entry.date}</span>
                </div>
                <ul className="space-y-1">
                  {entry.highlights.map((item, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-brand-purple mt-0.5 shrink-0">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-brand-dark/50 border border-brand-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-border bg-brand-dark">
          <h2 className="font-semibold text-slate-200 uppercase tracking-wider text-xs">
            {t('about.links')}
          </h2>
        </div>
        <div className="p-6 space-y-3">
          {data?.github_url && (
            <a
              href={data.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between group p-3 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3 text-slate-300 text-sm group-hover:text-slate-100 transition-colors">
                <Github className="w-4 h-4" />
                {t('about.sourceCode')}
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </a>
          )}
          <a
            href="https://github.com/yuriPeixoto/aegis/blob/main/docs/roadmap.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between group p-3 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3 text-slate-300 text-sm group-hover:text-slate-100 transition-colors">
              <ExternalLink className="w-4 h-4" />
              {t('about.roadmap')}
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
          </a>
        </div>
      </div>
    </div>
  )
}
