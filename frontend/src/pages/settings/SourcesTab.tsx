import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useSources,
  useCreateSource,
  useUpdateSource,
  useRegenerateSourceKey,
  type SourceCreated,
  type Source,
} from '../../hooks/useSources'
import { inputCls, Modal, Field, FormError, ModalActions } from './shared'

interface SourceRowProps {
  source: Source
  onEdit: () => void
  onKeysRevealed: (keys: { api_key: string; webhook_secret: string }) => void
}

function SourceRow({ source, onEdit }: SourceRowProps) {
  const { t } = useTranslation()
  const updateSource = useUpdateSource(source.id)

  return (
    <tr className="border-b border-slate-800">
      <td className="py-2.5 text-slate-200">
        {source.name}
        {!source.is_active && (
          <span className="ml-2 text-[10px] text-slate-500 border border-slate-700 rounded px-1 py-0.5">
            inativa
          </span>
        )}
      </td>
      <td className="py-2.5 text-slate-400 font-mono text-xs">{source.slug}</td>
      <td className="py-2.5">
        {source.is_active ? (
          <span className="text-xs text-emerald-400">{t('settings.sources.active')}</span>
        ) : (
          <span className="text-xs text-slate-500">{t('settings.sources.inactive')}</span>
        )}
      </td>
      <td className="py-2.5 text-slate-500 text-xs">
        {new Date(source.created_at).toLocaleDateString()}
      </td>
      <td className="py-2.5 text-right">
        <div className="flex items-center justify-end gap-3">
          <button onClick={onEdit} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            {t('settings.users.edit')}
          </button>
          <button
            onClick={() => updateSource.mutate({ is_active: !source.is_active })}
            disabled={updateSource.isPending}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
          >
            {source.is_active ? t('settings.sources.deactivate') : t('settings.sources.activate')}
          </button>
        </div>
      </td>
    </tr>
  )
}

function CreateSourceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (s: SourceCreated) => void
}) {
  const { t } = useTranslation()
  const { mutate, isPending, error } = useCreateSource()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  const handleNameChange = (value: string) => {
    setName(value)
    setSlug(value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
  }

  return (
    <Modal title={t('settings.sources.modalTitle')} onClose={onClose}>
      <form
        onSubmit={(e) => { e.preventDefault(); mutate({ name, slug }, { onSuccess: onCreated }) }}
        className="space-y-4"
      >
        <Field label={t('settings.sources.fieldName')}>
          <input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)} required minLength={2} className={inputCls} />
        </Field>
        <Field label={t('settings.sources.fieldSlug')}>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} required minLength={2} pattern="^[a-z0-9-]+$" className={`${inputCls} font-mono`} />
          <p className="text-xs text-slate-600 mt-1">{t('settings.sources.slugHint')}</p>
        </Field>
        <FormError error={error} fallback={t('settings.sources.errorGeneric')} />
        <ModalActions onClose={onClose} isPending={isPending} submitLabel={t('settings.sources.create')} pendingLabel={t('settings.sources.creating')} />
      </form>
    </Modal>
  )
}

function EditSourceModal({
  source,
  onClose,
  onKeysRegenerated,
}: {
  source: Source
  onClose: () => void
  onKeysRegenerated: (keys: { api_key: string; webhook_secret: string }) => void
}) {
  const { t } = useTranslation()
  const updateSource = useUpdateSource(source.id)
  const regenerateKey = useRegenerateSourceKey(source.id)
  const [name, setName] = useState(source.name)
  const [webhookUrl, setWebhookUrl] = useState(source.webhook_url ?? '')
  const [csatEnabled, setCsatEnabled] = useState(source.csat_enabled)
  const [csatSamplingPct, setCsatSamplingPct] = useState(source.csat_sampling_pct)
  const [confirmRegen, setConfirmRegen] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateSource.mutate(
      { name, webhook_url: webhookUrl, csat_enabled: csatEnabled, csat_sampling_pct: csatSamplingPct },
      { onSuccess: onClose },
    )
  }

  const handleRegen = () => {
    regenerateKey.mutate(undefined, {
      onSuccess: (data) => onKeysRegenerated(data),
    })
  }

  return (
    <Modal title={t('settings.sources.editTitle')} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <Field label={t('settings.sources.fieldName')}>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className={inputCls} />
        </Field>
        <Field label={t('settings.sources.fieldSlug')}>
          <div className={`${inputCls} text-slate-500 font-mono cursor-not-allowed`}>{source.slug}</div>
          <p className="text-xs text-slate-600 mt-1">{t('settings.sources.slugImmutable')}</p>
        </Field>
        <Field label={t('settings.sources.fieldWebhookUrl')}>
          <input type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className={inputCls} placeholder="https://..." />
          <p className="text-xs text-slate-600 mt-1">{t('settings.sources.webhookUrlHint')}</p>
        </Field>

        <div className="border border-slate-700 rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-300">{t('settings.sources.csatTitle')}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{t('settings.sources.csatEnable')}</span>
            <button
              type="button"
              onClick={() => setCsatEnabled((v) => !v)}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${csatEnabled ? 'bg-purple-600' : 'bg-slate-600'}`}
            >
              <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${csatEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {csatEnabled && (
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400 whitespace-nowrap">{t('settings.sources.csatSampling')}</label>
              <input type="number" min={1} max={100} value={csatSamplingPct} onChange={(e) => setCsatSamplingPct(Math.min(100, Math.max(1, Number(e.target.value))))} className={`${inputCls} w-20 text-center`} />
              <span className="text-xs text-slate-400">{t('settings.sources.csatSamplingHint')}</span>
            </div>
          )}
          <p className="text-xs text-slate-500">
            {t('settings.sources.csatDescription', { req: 'csat_request', sub: 'csat_submitted' })}
          </p>
        </div>

        <div className="border border-amber-500/20 rounded-lg p-4 bg-amber-950/10 space-y-2">
          <p className="text-xs font-semibold text-amber-400">{t('settings.sources.regenTitle')}</p>
          <p className="text-xs text-slate-400">{t('settings.sources.regenWarning')}</p>
          {!confirmRegen ? (
            <button type="button" onClick={() => setConfirmRegen(true)} className="text-xs text-amber-400 hover:text-amber-300 underline transition-colors">
              {t('settings.sources.regenButton')}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{t('settings.sources.regenConfirm')}</span>
              <button type="button" onClick={handleRegen} disabled={regenerateKey.isPending} className="text-xs px-2 py-1 rounded bg-amber-500 text-black font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors">
                {regenerateKey.isPending ? t('settings.sources.regenPending') : t('settings.sources.regenConfirmButton')}
              </button>
              <button type="button" onClick={() => setConfirmRegen(false)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                {t('settings.sources.cancel')}
              </button>
            </div>
          )}
        </div>

        <ModalActions onClose={onClose} isPending={updateSource.isPending} submitLabel={t('settings.users.save')} pendingLabel={t('settings.users.saving')} />
      </form>
    </Modal>
  )
}

function ApiKeyAlert({
  api_key,
  webhook_secret,
  onClose,
}: {
  api_key: string
  webhook_secret: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)

  const copy = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-amber-500/50 rounded-lg w-full max-w-lg p-6">
        <h3 className="text-base font-semibold text-amber-400 mb-1">{t('settings.sources.apiKeyTitle')}</h3>
        <p className="text-xs text-slate-400 mb-4">{t('settings.sources.apiKeyWarning')}</p>

        <div className="space-y-4 mb-6">
          {[
            { label: 'API KEY', value: api_key, copied: copiedKey, setCopied: setCopiedKey },
            { label: t('settings.sources.webhookSecretLabel'), value: webhook_secret, copied: copiedSecret, setCopied: setCopiedSecret },
          ].map(({ label, value, copied, setCopied }) => (
            <div key={label}>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5 px-1">{label}</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-800 rounded p-3 font-mono text-xs text-slate-200 break-all border border-slate-700">{value}</div>
                <button onClick={() => copy(value, setCopied)} className="shrink-0 px-3 py-1.5 text-xs rounded border border-slate-700 text-slate-400 hover:text-white hover:bg-white/5 transition-all self-start">
                  {copied ? t('settings.sources.copied') : t('settings.sources.copy')}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-6 py-2 text-sm font-semibold rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 transition-all shadow-lg shadow-brand-accent/20">
            {t('settings.sources.apiKeyConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function SourcesTab() {
  const { t } = useTranslation()
  const { data: sources, isLoading } = useSources()
  const [showCreate, setShowCreate] = useState(false)
  const [editingSource, setEditingSource] = useState<Source | null>(null)
  const [revealedKeys, setRevealedKeys] = useState<{ api_key: string; webhook_secret: string } | null>(null)

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-slate-200">{t('settings.sources.title')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('settings.sources.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 text-sm rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors"
        >
          {t('settings.sources.new')}
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">{t('inbox.loading')}</p>
      ) : !sources?.length ? (
        <p className="text-sm text-slate-500">{t('settings.sources.empty')}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
              <th className="pb-2 font-medium">{t('settings.sources.colName')}</th>
              <th className="pb-2 font-medium">{t('settings.sources.colSlug')}</th>
              <th className="pb-2 font-medium">{t('settings.sources.colStatus')}</th>
              <th className="pb-2 font-medium">{t('settings.sources.colCreated')}</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                onEdit={() => setEditingSource(source)}
                onKeysRevealed={(keys) => setRevealedKeys(keys)}
              />
            ))}
          </tbody>
        </table>
      )}

      {showCreate && (
        <CreateSourceModal
          onClose={() => setShowCreate(false)}
          onCreated={(s) => { setShowCreate(false); setRevealedKeys({ api_key: s.api_key, webhook_secret: s.webhook_secret }) }}
        />
      )}
      {editingSource && (
        <EditSourceModal
          source={editingSource}
          onClose={() => setEditingSource(null)}
          onKeysRegenerated={(keys) => { setEditingSource(null); setRevealedKeys(keys) }}
        />
      )}
      {revealedKeys && (
        <ApiKeyAlert
          api_key={revealedKeys.api_key}
          webhook_secret={revealedKeys.webhook_secret}
          onClose={() => setRevealedKeys(null)}
        />
      )}
    </section>
  )
}
