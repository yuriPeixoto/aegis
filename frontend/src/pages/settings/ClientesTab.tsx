import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useClientes, useCreateCliente, useUpdateCliente, useSetClienteModulos, type Cliente } from '../../hooks/useClientes'
import { useModulos } from '../../hooks/useModulos'
import { useSources } from '../../hooks/useSources'
import { Avatar } from '../../components/common/Avatar'
import { inputCls, Modal, Field, FormError, ModalActions } from './shared'

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-brand-accent' : 'bg-slate-600'}`}
    >
      <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

function ClienteRow({ cliente, onEdit }: { cliente: Cliente; onEdit: () => void }) {
  const { t } = useTranslation()
  const updateCliente = useUpdateCliente(cliente.id)

  return (
    <tr className="border-b border-slate-800">
      <td className="py-2.5 text-slate-200">
        <div className="flex items-center gap-2">
          <Avatar name={cliente.nome} size="xs" />
          {cliente.nome}
        </div>
      </td>
      <td className="py-2.5">
        {cliente.ativo ? (
          <span className="text-xs text-emerald-400">{t('settings.clientes.active')}</span>
        ) : (
          <span className="text-xs text-slate-500">{t('settings.clientes.inactive')}</span>
        )}
      </td>
      <td className="py-2.5 text-slate-400 font-mono text-xs">
        {cliente.source_name ?? <span className="text-slate-600">{t('settings.clientes.noSource')}</span>}
      </td>
      <td className="py-2.5">
        <div className="flex flex-wrap gap-1 max-w-xs">
          {cliente.modulos.length ? (
            cliente.modulos.map((m) => (
              <span key={m.modulo_id} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                {m.nome}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-600">{t('settings.clientes.noModulos')}</span>
          )}
        </div>
      </td>
      <td className="py-2.5 text-right">
        <div className="flex items-center justify-end gap-3">
          <button onClick={onEdit} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            {t('settings.users.edit')}
          </button>
          <button
            onClick={() => updateCliente.mutate({ ativo: !cliente.ativo, source_id: cliente.source_id })}
            disabled={updateCliente.isPending}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
          >
            {cliente.ativo ? t('settings.clientes.deactivate') : t('settings.clientes.activate')}
          </button>
        </div>
      </td>
    </tr>
  )
}

function CreateClienteModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const { data: sources } = useSources()
  const { mutate, isPending, error } = useCreateCliente()
  const [nome, setNome] = useState('')
  const [sourceId, setSourceId] = useState('')

  return (
    <Modal title={t('settings.clientes.modalTitle')} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          mutate({ nome, source_id: sourceId ? Number(sourceId) : null }, { onSuccess: onClose })
        }}
        className="space-y-4"
      >
        <Field label={t('settings.clientes.fieldName')}>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} className={inputCls} />
        </Field>
        <Field label={t('settings.clientes.fieldSource')}>
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className={inputCls}>
            <option value="">{t('settings.clientes.noSourceOption')}</option>
            {(sources ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <p className="text-xs text-slate-600 mt-1">{t('settings.clientes.sourceHint')}</p>
        </Field>
        <FormError error={error} fallback={t('settings.clientes.errorGeneric')} />
        <ModalActions onClose={onClose} isPending={isPending} submitLabel={t('settings.clientes.create')} pendingLabel={t('settings.clientes.creating')} />
      </form>
    </Modal>
  )
}

function EditClienteModal({ cliente, onClose }: { cliente: Cliente; onClose: () => void }) {
  const { t } = useTranslation()
  const { data: sources } = useSources()
  const { data: modulos } = useModulos()
  const updateCliente = useUpdateCliente(cliente.id)
  const setModulos = useSetClienteModulos(cliente.id)
  const [nome, setNome] = useState(cliente.nome)
  const [ativo, setAtivo] = useState(cliente.ativo)
  const [sourceId, setSourceId] = useState(cliente.source_id?.toString() ?? '')
  const [moduloIds, setModuloIds] = useState<Set<number>>(
    new Set(cliente.modulos.filter((m) => m.ativo).map((m) => m.modulo_id)),
  )

  const toggleModulo = (id: number) => {
    setModuloIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isPending = updateCliente.isPending || setModulos.isPending

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateCliente.mutate(
      { nome, ativo, source_id: sourceId ? Number(sourceId) : null },
      {
        onSuccess: () => {
          setModulos.mutate(Array.from(moduloIds), { onSuccess: onClose })
        },
      },
    )
  }

  return (
    <Modal title={t('settings.clientes.editTitle')} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <Field label={t('settings.clientes.fieldName')}>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} className={inputCls} />
        </Field>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{t('settings.clientes.fieldActive')}</span>
          <Toggle on={ativo} onClick={() => setAtivo((v) => !v)} />
        </div>

        <Field label={t('settings.clientes.fieldSource')}>
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className={inputCls}>
            <option value="">{t('settings.clientes.noSourceOption')}</option>
            {(sources ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <p className="text-xs text-slate-600 mt-1">{t('settings.clientes.sourceHint')}</p>
        </Field>

        <div className="border border-slate-700 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-slate-300">{t('settings.clientes.modulosTitle')}</p>
            <span className="text-xs text-slate-500">
              {t('settings.clientes.modulosCount', { on: moduloIds.size, total: modulos?.length ?? 0 })}
            </span>
          </div>
          {(modulos ?? []).map((m) => (
            <div key={m.id} className="flex items-center justify-between py-1">
              <span className="text-sm text-slate-300">{m.nome}</span>
              <Toggle on={moduloIds.has(m.id)} onClick={() => toggleModulo(m.id)} />
            </div>
          ))}
          <p className="text-xs text-slate-600 pt-1">{t('settings.clientes.modulosHint')}</p>
        </div>

        <FormError error={updateCliente.error || setModulos.error} fallback={t('settings.clientes.errorGeneric')} />
        <ModalActions onClose={onClose} isPending={isPending} submitLabel={t('settings.users.save')} pendingLabel={t('settings.users.saving')} />
      </form>
    </Modal>
  )
}

export function ClientesTab() {
  const { t } = useTranslation()
  const { data: clientes, isLoading } = useClientes()
  const [showCreate, setShowCreate] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-slate-200">{t('settings.clientes.title')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('settings.clientes.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 text-sm rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors"
        >
          {t('settings.clientes.new')}
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">{t('inbox.loading')}</p>
      ) : !clientes?.length ? (
        <p className="text-sm text-slate-500">{t('settings.clientes.empty')}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
              <th className="pb-2 font-medium">{t('settings.clientes.colName')}</th>
              <th className="pb-2 font-medium">{t('settings.clientes.colStatus')}</th>
              <th className="pb-2 font-medium">{t('settings.clientes.colSource')}</th>
              <th className="pb-2 font-medium">{t('settings.clientes.colModulos')}</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => (
              <ClienteRow key={cliente.id} cliente={cliente} onEdit={() => setEditingCliente(cliente)} />
            ))}
          </tbody>
        </table>
      )}

      {showCreate && <CreateClienteModal onClose={() => setShowCreate(false)} />}
      {editingCliente && <EditClienteModal cliente={editingCliente} onClose={() => setEditingCliente(null)} />}
    </section>
  )
}
