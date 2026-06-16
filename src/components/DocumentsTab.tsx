import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Download, FileText, Loader2, Paperclip, Trash2, Upload } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Client, Project } from '../types'

const DOCUMENTS_BUCKET = 'project-documents'

type Attachment = {
  id?: string | null
  name: string
  created_at?: string | null
  updated_at?: string | null
  metadata?: {
    size?: number
    mimetype?: string
  } | null
}

interface Props {
  project: Project
  client?: Client
  substationType?: { name: string }
  requestTypes?: { id: string; name: string }[]
}

export default function DocumentsTab({ project }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingName, setDeletingName] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAttachments()
  }, [project.id])

  async function loadAttachments() {
    setLoading(true)
    setError('')

    const { data, error: listError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .list(project.id, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })

    if (listError) {
      setError('Não foi possível carregar os anexos. Verifique se o bucket project-documents existe no Supabase Storage.')
      setAttachments([])
    } else {
      setAttachments((data ?? []).filter(item => item.name !== '.emptyFolderPlaceholder'))
    }

    setLoading(false)
  }

  async function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return

    setUploading(true)
    setError('')

    for (const file of files) {
      const path = `${project.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined,
        })

      if (uploadError) {
        setError(`Falha ao anexar "${file.name}". ${uploadError.message}`)
        break
      }
    }

    event.target.value = ''
    setUploading(false)
    await loadAttachments()
  }

  async function downloadAttachment(name: string) {
    setError('')
    const { data, error: signedUrlError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(`${project.id}/${name}`, 60)

    if (signedUrlError || !data?.signedUrl) {
      setError('Não foi possível gerar o link de download.')
      return
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function deleteAttachment(name: string) {
    if (!confirm(`Excluir o anexo "${displayName(name)}"?`)) return

    setDeletingName(name)
    setError('')

    const { error: removeError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .remove([`${project.id}/${name}`])

    if (removeError) {
      setError('Não foi possível excluir o anexo.')
    } else {
      setAttachments(prev => prev.filter(item => item.name !== name))
    }

    setDeletingName(null)
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Paperclip size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Anexos do projeto</p>
            <p className="text-xs text-slate-500">
              Arquivos salvos no Supabase Storage para este projeto.
            </p>
          </div>
        </div>

        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="app-button-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? 'Enviando...' : 'Anexar arquivos'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 py-12 text-sm text-slate-500">
          <Loader2 size={18} className="mr-2 animate-spin" />
          Carregando anexos...
        </div>
      ) : attachments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
          <FileText size={30} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Nenhum anexo enviado</p>
          <p className="mt-1 text-xs text-slate-500">
            Anexe ARTs, formulários, procurações, croquis, protocolos ou documentos da concessionária.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="grid grid-cols-[1fr_140px_160px_96px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <div>Arquivo</div>
            <div>Tamanho</div>
            <div>Enviado em</div>
            <div className="text-right">Ações</div>
          </div>

          <div className="divide-y divide-slate-100">
            {attachments.map(file => (
              <div key={file.id ?? file.name} className="grid grid-cols-[1fr_140px_160px_96px] items-center gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{displayName(file.name)}</p>
                    <p className="truncate text-xs text-slate-400">{file.metadata?.mimetype ?? 'Arquivo'}</p>
                  </div>
                </div>
                <div className="text-sm text-slate-500">{formatBytes(file.metadata?.size)}</div>
                <div className="text-sm text-slate-500">{formatDate(file.created_at ?? file.updated_at)}</div>
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => downloadAttachment(file.name)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand"
                    title="Baixar anexo"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAttachment(file.name)}
                    disabled={deletingName === file.name}
                    className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    title="Excluir anexo"
                  >
                    {deletingName === file.name ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function displayName(name: string) {
  return name.replace(/^\d+-/, '')
}

function formatBytes(size?: number) {
  if (!size) return '—'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
