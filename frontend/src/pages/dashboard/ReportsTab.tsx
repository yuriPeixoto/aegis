import { useTranslation } from 'react-i18next'
import { BarChart2 } from 'lucide-react'

export function ReportsTab() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <BarChart2 className="w-10 h-10 text-slate-600" />
      <p className="text-sm font-medium text-slate-400">{t('dashboard.reports.soon')}</p>
      <p className="text-xs text-slate-600 max-w-xs">{t('dashboard.reports.soonHint')}</p>
    </div>
  )
}
