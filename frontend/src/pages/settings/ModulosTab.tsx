import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useModulos, useCreateModulo, useUpdateModulo } from '../../hooks/useModulos'
import { inputCls, Modal, Field, FormError, ModalActions } from './shared'

function ModuloRow({ modulo }: { modulo: { id: number; nome: string; ativo: boolean; clientes_count: number } }) {
  const { t } = useTranslation()
  const updateModulo = useUpdateModulo(modulo.id)

  return (
    <tr className="border-b border-slate-800">
      <td className="py-2.5 text-slate-200">{modulo.nome}</td>
      <td className="py-2.5">
        {modulo.ativo ? (
          <span className="text-xs text-emerald-400">{t('settings.clientes.active')}</span>
        ) : (
          <span className="text-xs text-slate-500">{t('settings.clientes.inactive')}</span>
        )}
      </td>
      <td className="py-2.5 text-slate-400 text-xs">
        {t('settings.modulos.clientesUsando', { count: modulo.clientes_count })}
      </td>
      <td className="py-2.5 text-right">
        <button
          onClick={() => updateModulo.mutate({ ativo: !modulo.ativo })}
          disabled={updateModulo.isPending}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
        >
          {modulo.ativo ? t('settings.clientes.deactivate') : t('settings.clientes.activate')}
        </button>
      </td>
    </tr>
  )
}

function CreateModuloModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const { mutate, isPending, error } = useCreateModulo()
  const [nome, setNome] = useState('')

  return (
    <Modal title={t('settings.modulos.modalTitle')} onClose={onClose}>
      <form
        onSubmit={(e) => { e.preventDefault(); mutate(nome, { onSuccess: onClose }) }}
        className="space-y-4"
      >
        <Field label={t('settings.modulos.fieldName')}>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} className={inputCls} placeholder={t('settings.modulos.fieldNamePlaceholder')} />
        </Field>
        <FormError error={error} fallback={t('settings.clientes.errorGeneric')} />
        <ModalActions onClose={onClose} isPending={isPending} submitLabel={t('settings.clientes.create')} pendingLabel={t('settings.clientes.creating')} />
      </form>
    </Modal>
  )
}

export function ModulosTab() {
  const { t } = useTranslation()
  const { data: modulos, isLoading } = useModulos()
  const [showCreate, setShowCreate] = useState(false)

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-slate-200">{t('settings.modulos.title')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('settings.modulos.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 text-sm rounded-md bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors"
        >
          {t('settings.modulos.new')}
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">{t('inbox.loading')}</p>
      ) : !modulos?.length ? (
        <p className="text-sm text-slate-500">{t('settings.modulos.empty')}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
              <th className="pb-2 font-medium">{t('settings.modulos.colName')}</th>
              <th className="pb-2 font-medium">{t('settings.clientes.colStatus')}</th>
              <th className="pb-2 font-medium">{t('settings.modulos.colClientes')}</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {modulos.map((modulo) => (
              <ModuloRow key={modulo.id} modulo={modulo} />
            ))}
          </tbody>
        </table>
      )}

      {showCreate && <CreateModuloModal onClose={() => setShowCreate(false)} />}
    </section>
  )
}
