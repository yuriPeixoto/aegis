import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Paperclip, Download, FileText, FileSpreadsheet, File, ImageIcon, Loader2 } from 'lucide-react'
import { useAttachments, useUploadAttachment } from '../../hooks/useTickets'
import { api } from '../../lib/axios'
import type { TicketAttachment } from '../../types/ticket'

interface AttachmentsPanelProps {
  ticketId: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ contentType }: { contentType: string }) {
  if (contentType.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
  if (contentType === 'application/pdf') return <FileText className="w-4 h-4 text-red-400 shrink-0" />
  if (contentType.includes('spreadsheet') || contentType.includes('excel') || contentType === 'text/csv')
    return <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
  return <File className="w-4 h-4 text-slate-400 shrink-0" />
}

async function triggerDownload(attachment: TicketAttachment) {
  const { data } = await api.get(attachment.download_url, { responseType: 'blob' })
  const url = URL.createObjectURL(data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = attachment.original_filename
  a.click()
  URL.revokeObjectURL(url)
}

export function AttachmentsPanel({ ticketId }: AttachmentsPanelProps) {
  const { t } = useTranslation()
  const { data: attachments = [], isLoading } = useAttachments(ticketId)
  const { mutate: upload, isPending } = useUploadAttachment(ticketId)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    upload(file)
    e.target.value = ''
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          {t('inbox.detail.attachments')}
        </h3>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          title={t('inbox.detail.uploadAttachment')}
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Paperclip className="w-3.5 h-3.5" />
          )}
          {t('inbox.detail.attachFile')}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.txt,.csv,.xlsx,.xls,.docx,.doc"
          onChange={handleFileChange}
        />
      </div>

      {isLoading ? (
        <p className="text-xs text-slate-600 font-mono animate-pulse">{t('inbox.detail.loading')}</p>
      ) : attachments.length === 0 ? (
        <p className="text-xs text-slate-600 font-mono">{t('inbox.detail.noAttachments')}</p>
      ) : (
        <div className="space-y-1.5">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2"
            >
              <FileIcon contentType={attachment.content_type} />
              <span
                className="flex-1 text-xs text-slate-300 truncate"
                title={attachment.original_filename}
              >
                {attachment.original_filename}
              </span>
              <span className="text-[10px] text-slate-500 shrink-0">
                {formatBytes(attachment.size_bytes)}
              </span>
              <button
                onClick={() => triggerDownload(attachment)}
                className="p-1 text-slate-500 hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
                title={t('inbox.detail.download')}
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
