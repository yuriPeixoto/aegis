import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Trash2, Copy, ExternalLink, CheckCircle2, FileDown, GraduationCap,
} from 'lucide-react'
import { api } from '../lib/axios'
import { useUsers } from '../hooks/useTickets'
import { useSources } from '../hooks/useSources'
import {
  useTrainingRecord,
  useCreateTrainingRecord,
  useUpdateTrainingRecord,
  useAddParticipant,
  useRemoveParticipant,
  useSignInstructor,
  useSignResponsible,
} from '../hooks/useTrainingRecords'
import { FormSelect } from '../components/common/FormSelect'
import { SignatureCanvas, type SignatureCanvasHandle } from '../components/common/SignatureCanvas'
import type { TrainingModality, TrainingModule, TrainingType } from '../types/training'

const MODALITIES: TrainingModality[] = ['presencial', 'remoto']
const TRAINING_TYPES: TrainingType[] = ['inicial', 'reciclagem', 'atualizacao', 'nova_funcionalidade']

export function TrainingRecordDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const isNew = id === 'novo' || !id
  const recordId = isNew ? 0 : Number(id)

  const { data: record } = useTrainingRecord(recordId)
  const { data: users = [] } = useUsers()
  const { data: sources = [] } = useSources()

  const createMut = useCreateTrainingRecord()
  const updateMut = useUpdateTrainingRecord(recordId)
  const addParticipantMut = useAddParticipant(recordId)
  const removeParticipantMut = useRemoveParticipant(recordId)
  const signInstructorMut = useSignInstructor(recordId)
  const signResponsibleMut = useSignResponsible(recordId)

  const [form, setForm] = useState({
    training_name: '',
    system_module: '',
    version: '',
    training_date: '',
    start_time: '',
    end_time: '',
    workload_hours: '',
    modality: 'presencial' as TrainingModality,
    training_type: 'inicial' as TrainingType,
    area_sector: '',
    instructor_user_id: '',
    instructor_title: '',
    source_id: searchParams.get('source_id') ?? '',
    evaluation_method: '',
    performance_notes: '',
    general_notes: '',
  })
  const [modules, setModules] = useState<TrainingModule[]>([])
  const [loadedFromRecord, setLoadedFromRecord] = useState(false)

  useEffect(() => {
    if (!record || loadedFromRecord) return
    setForm({
      training_name: record.training_name,
      system_module: record.system_module,
      version: record.version ?? '',
      training_date: record.training_date,
      start_time: record.start_time ?? '',
      end_time: record.end_time ?? '',
      workload_hours: record.workload_hours ?? '',
      modality: record.modality,
      training_type: record.training_type,
      area_sector: record.area_sector ?? '',
      instructor_user_id: String(record.instructor.id),
      instructor_title: record.instructor_title ?? '',
      source_id: record.source ? String(record.source.id) : '',
      evaluation_method: record.evaluation_method ?? '',
      performance_notes: record.performance_notes ?? '',
      general_notes: record.general_notes ?? '',
    })
    setModules(record.modules)
    setLoadedFromRecord(true)
  }, [record, loadedFromRecord])

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleAddModule = () => setModules((prev) => [...prev, { module: '', subjects: '' }])
  const handleRemoveModule = (idx: number) =>
    setModules((prev) => prev.filter((_, i) => i !== idx))
  const handleModuleChange = (idx: number, field: keyof TrainingModule, value: string) =>
    setModules((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)))

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const basePayload = {
      training_name: form.training_name,
      system_module: form.system_module,
      version: form.version || null,
      training_date: form.training_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      workload_hours: form.workload_hours || null,
      modality: form.modality,
      training_type: form.training_type,
      area_sector: form.area_sector || null,
      instructor_user_id: Number(form.instructor_user_id),
      instructor_title: form.instructor_title || null,
      modules,
      evaluation_method: form.evaluation_method || null,
      performance_notes: form.performance_notes || null,
      general_notes: form.general_notes || null,
    }

    if (isNew) {
      createMut.mutate(
        {
          ...basePayload,
          source_id: form.source_id ? Number(form.source_id) : null,
          calendar_event_id: searchParams.get('calendar_event_id')
            ? Number(searchParams.get('calendar_event_id'))
            : null,
        },
        {
          onSuccess: (created) => {
            toast.success(t('training.detail.savedToast'))
            navigate(`/treinamentos/${created.id}`, { replace: true })
          },
        },
      )
    } else {
      updateMut.mutate(basePayload, { onSuccess: () => toast.success(t('training.detail.savedToast')) })
    }
  }

  const [participantForm, setParticipantForm] = useState({ name: '', role_title: '', sector: '' })
  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault()
    if (!participantForm.name.trim()) return
    addParticipantMut.mutate(
      {
        name: participantForm.name.trim(),
        role_title: participantForm.role_title.trim() || null,
        sector: participantForm.sector.trim() || null,
      },
      { onSuccess: () => setParticipantForm({ name: '', role_title: '', sector: '' }) },
    )
  }

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/assinar-treinamento/${token}`
    navigator.clipboard.writeText(url)
    toast.success(t('training.detail.linkCopied'))
  }

  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const handleDownloadPdf = async () => {
    // Open the tab synchronously, in direct response to the click — opening it
    // after the await below loses the user-activation context and gets blocked
    // as a popup in some browsers (Safari in particular, sometimes Chrome too).
    const pdfWindow = window.open('', '_blank')
    setDownloadingPdf(true)
    try {
      const { data } = await api.get(`/training-records/${recordId}/pdf`, { responseType: 'blob' })
      const blobUrl = URL.createObjectURL(data)
      if (pdfWindow) {
        pdfWindow.location.href = blobUrl
      } else {
        window.open(blobUrl, '_blank')
      }
    } catch {
      pdfWindow?.close()
      toast.error(t('training.detail.pdfError'))
    } finally {
      setDownloadingPdf(false)
    }
  }

  const instructorSigRef = useRef<SignatureCanvasHandle>(null)
  const handleSignInstructor = () => {
    const data = instructorSigRef.current?.toDataUrl()
    if (!data) return
    signInstructorMut.mutate(data, { onSuccess: () => toast.success(t('training.detail.instructorSigned')) })
  }

  const [responsibleName, setResponsibleName] = useState('')
  const responsibleSigRef = useRef<SignatureCanvasHandle>(null)
  const handleSignResponsible = () => {
    const data = responsibleSigRef.current?.toDataUrl()
    if (!data || !responsibleName.trim()) return
    signResponsibleMut.mutate(
      { responsible_name: responsibleName.trim(), signature_data: data },
      { onSuccess: () => toast.success(t('training.detail.responsibleSigned')) },
    )
  }

  const userOptions = users.map((u) => ({ value: String(u.id), label: u.name }))
  const sourceOptions = [
    { value: '', label: t('training.detail.noSource') },
    ...sources.filter((s) => s.is_active).map((s) => ({ value: String(s.id), label: s.name })),
  ]
  const modalityOptions = MODALITIES.map((m) => ({ value: m, label: t(`training.modality.${m}`) }))
  const typeOptions = TRAINING_TYPES.map((tt) => ({ value: tt, label: t(`training.type.${tt}`) }))

  const isSaving = createMut.isPending || updateMut.isPending

  return (
    <div className="p-6 max-w-3xl mx-auto pb-16">
      <button
        onClick={() => navigate('/treinamentos')}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('training.detail.back')}
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-brand-purple" />
          {isNew ? t('training.detail.newTitle') : record?.training_name ?? '...'}
        </h1>
        {!isNew && record && (
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-slate-300 transition-colors disabled:opacity-50"
          >
            <FileDown className="w-3.5 h-3.5" />
            {t('training.detail.downloadPdf')}
          </button>
        )}
      </div>

      <form onSubmit={handleSave} className="glass-card p-6 space-y-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          {t('training.detail.section1')}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs text-slate-400 mb-1.5">{t('training.fields.trainingName')}</label>
            <input className="input" required value={form.training_name} onChange={(e) => setField('training_name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">{t('training.fields.systemModule')}</label>
            <input className="input" required value={form.system_module} onChange={(e) => setField('system_module', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">{t('training.fields.version')}</label>
            <input className="input" value={form.version} onChange={(e) => setField('version', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">{t('training.fields.date')}</label>
            <input type="date" className="input" required value={form.training_date} onChange={(e) => setField('training_date', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">{t('training.fields.workloadHours')}</label>
            <input className="input" placeholder="2h" value={form.workload_hours} onChange={(e) => setField('workload_hours', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">{t('training.fields.startTime')}</label>
            <input type="time" className="input" value={form.start_time} onChange={(e) => setField('start_time', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">{t('training.fields.endTime')}</label>
            <input type="time" className="input" value={form.end_time} onChange={(e) => setField('end_time', e.target.value)} />
          </div>
          <FormSelect label={t('training.fields.modality')} value={form.modality} options={modalityOptions} onChange={(v) => setField('modality', v as TrainingModality)} />
          <FormSelect label={t('training.fields.type')} value={form.training_type} options={typeOptions} onChange={(v) => setField('training_type', v as TrainingType)} />
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">{t('training.fields.areaSector')}</label>
            <input className="input" value={form.area_sector} onChange={(e) => setField('area_sector', e.target.value)} />
          </div>
          {isNew && (
            <FormSelect label={t('training.fields.client')} value={form.source_id} options={sourceOptions} onChange={(v) => setField('source_id', v)} />
          )}
        </div>

        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest pt-2">
          {t('training.detail.section2')}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <FormSelect label={t('training.fields.instructor')} value={form.instructor_user_id} options={userOptions} onChange={(v) => setField('instructor_user_id', v)} placeholder={t('training.detail.selectInstructor')} />
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">{t('training.fields.instructorTitle')}</label>
            <input className="input" value={form.instructor_title} onChange={(e) => setField('instructor_title', e.target.value)} />
          </div>
        </div>

        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest pt-2">
          {t('training.detail.section3')}
        </h2>
        <div className="space-y-2">
          {modules.map((m, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <input
                className="input flex-1"
                placeholder={t('training.fields.moduleName')}
                value={m.module}
                onChange={(e) => handleModuleChange(idx, 'module', e.target.value)}
              />
              <input
                className="input flex-[2]"
                placeholder={t('training.fields.moduleSubjects')}
                value={m.subjects}
                onChange={(e) => handleModuleChange(idx, 'subjects', e.target.value)}
              />
              <button type="button" onClick={() => handleRemoveModule(idx)} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={handleAddModule} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            {t('training.detail.addModule')}
          </button>
        </div>

        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest pt-2">
          {t('training.detail.section5')}
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">{t('training.fields.evaluationMethod')}</label>
            <input className="input" value={form.evaluation_method} onChange={(e) => setField('evaluation_method', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">{t('training.fields.performanceNotes')}</label>
            <textarea className="input min-h-[70px]" value={form.performance_notes} onChange={(e) => setField('performance_notes', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">{t('training.fields.generalNotes')}</label>
            <textarea className="input min-h-[70px]" value={form.general_notes} onChange={(e) => setField('general_notes', e.target.value)} />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button type="submit" className="btn-primary" disabled={isSaving || !form.instructor_user_id}>
            {isSaving ? t('training.detail.saving') : t('training.detail.save')}
          </button>
        </div>
      </form>

      {!isNew && record && (
        <div className="glass-card p-6 mt-6 space-y-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            {t('training.detail.section4')}
          </h2>

          <div className="space-y-2">
            {record.participants.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-slate-200 truncate">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {[p.role_title, p.sector].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.has_signature ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {t('training.detail.signed')}
                    </span>
                  ) : (
                    <>
                      <button type="button" onClick={() => copyLink(p.signing_token)} className="p-1.5 text-slate-500 hover:text-slate-200 transition-colors" title={t('training.detail.copyLink')}>
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <a href={`/assinar-treinamento/${p.signing_token}`} target="_blank" rel="noreferrer" className="p-1.5 text-slate-500 hover:text-slate-200 transition-colors" title={t('training.detail.openLink')}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </>
                  )}
                  <button type="button" onClick={() => removeParticipantMut.mutate(p.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddParticipant} className="flex gap-2 items-end pt-2 border-t border-brand-border/50">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1.5">{t('training.fields.participantName')}</label>
              <input className="input" value={participantForm.name} onChange={(e) => setParticipantForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1.5">{t('training.fields.participantRole')}</label>
              <input className="input" value={participantForm.role_title} onChange={(e) => setParticipantForm((p) => ({ ...p, role_title: e.target.value }))} />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1.5">{t('training.fields.participantSector')}</label>
              <input className="input" value={participantForm.sector} onChange={(e) => setParticipantForm((p) => ({ ...p, sector: e.target.value }))} />
            </div>
            <button type="submit" className="btn-primary shrink-0" disabled={!participantForm.name.trim()}>
              {t('training.detail.addParticipant')}
            </button>
          </form>
        </div>
      )}

      {!isNew && record && (
        <div className="glass-card p-6 mt-6 space-y-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            {t('training.detail.section6')}
          </h2>

          <div>
            <p className="text-sm text-slate-300 mb-2">{t('training.detail.instructorSignLabel')}</p>
            {record.instructor_signed_at ? (
              <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{t('training.detail.signed')}</p>
            ) : (
              <>
                <SignatureCanvas ref={instructorSigRef} />
                <button type="button" onClick={handleSignInstructor} disabled={signInstructorMut.isPending} className="btn-primary mt-3">
                  {t('training.detail.confirmInstructorSignature')}
                </button>
              </>
            )}
          </div>

          <div className="pt-4 border-t border-brand-border/50">
            <p className="text-sm text-slate-300 mb-2">{t('training.detail.responsibleSignLabel')}</p>
            {record.responsible_signed_at ? (
              <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{record.responsible_name} — {t('training.detail.signed')}</p>
            ) : (
              <>
                <input
                  className="input mb-3"
                  placeholder={t('training.fields.responsibleName')}
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                />
                <SignatureCanvas ref={responsibleSigRef} />
                <button type="button" onClick={handleSignResponsible} disabled={signResponsibleMut.isPending || !responsibleName.trim()} className="btn-primary mt-3">
                  {t('training.detail.confirmResponsibleSignature')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
