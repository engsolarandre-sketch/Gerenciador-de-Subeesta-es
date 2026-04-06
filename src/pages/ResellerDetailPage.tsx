import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Mail, Phone, Copy, Check, Link, FolderOpen } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import clsx from 'clsx'

function getDaysLeft(iso?: string): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default function ResellerDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { resellers, deleteReseller, projects, clients, substationTypes } = useApp()
  const [copied, setCopied] = useState(false)

  const reseller = resellers.find(r => r.id === id)

  if (!reseller) {
    return (
      <div className="p-6 text-center py-20 text-gray-400">
        <p className="font-medium text-gray-700">Revendedor não encontrado.</p>
        <button
          onClick={() => navigate('/resellers')}
          className="mt-3 text-sm underline"
          style={{ color: 'var(--color-primary)' }}
        >
          Voltar para a lista
        </button>
      </div>
    )
  }

  const resellerProjects = projects.filter(p => p.resellerId === id)
  const activeProjects    = resellerProjects.filter(p => p.status !== 'CANCELLED' && p.status !== 'COMPLETED')
  const completedProjects = resellerProjects.filter(p => p.status === 'COMPLETED')

  const portalUrl = `${window.location.origin}/portal/${reseller.id}`

  function handleCopyLink() {
    navigator.clipboard.writeText(portalUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleDelete() {
    const r = reseller!
    if (confirm(`Deseja realmente excluir o revendedor "${r.name}"?`)) {
      deleteReseller(r.id)
      navigate('/resellers')
    }
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/resellers')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
            style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary)' }}
          >
            {reseller.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{reseller.name}</h1>
            <p className="text-sm text-gray-400">Revendedor</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate(`/resellers/${reseller.id}/edit`)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Editar
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
            style={{ color: 'var(--color-error)', borderColor: 'var(--color-error-highlight)' }}
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        </div>
      </div>

      {/* Dados do revendedor */}
      <div className="bg-white rounded-2xl border p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Dados de contato</h2>
        {reseller.email && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Mail className="w-4 h-4 text-gray-400 shrink-0" />
            {reseller.email}
          </div>
        )}
        {reseller.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
            {reseller.phone}
          </div>
        )}
        {!reseller.email && !reseller.phone && (
          <p className="text-sm text-gray-400">Nenhum dado de contato cadastrado.</p>
        )}
      </div>

      {/* Link do portal */}
      <div className="bg-white rounded-2xl border p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Link do Portal</h2>
        <p className="text-xs text-gray-400">
          Compartilhe este link com o revendedor. Ele poderá visualizar apenas os projetos dele.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <code className="flex-1 text-xs bg-gray-50 border rounded-lg px-3 py-2 text-gray-600 truncate">
            {portalUrl}
          </code>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all shrink-0"
            style={{
              background: copied ? 'var(--color-success-highlight)' : 'var(--color-primary-highlight)',
              color:      copied ? 'var(--color-success)'           : 'var(--color-primary)',
            }}
          >
            {copied
              ? <><Check className="w-4 h-4" /> Copiado!</>
              : <><Copy  className="w-4 h-4" /> Copiar link</>
            }
          </button>
          <button
            onClick={() => window.open(portalUrl, '_blank')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
          >
            <Link className="w-4 h-4" />
            Abrir portal
          </button>
        </div>
      </div>

      {/* Projetos */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Projetos</h2>
          <div className="flex gap-3 text-xs text-gray-400">
            <span>{activeProjects.length} ativo{activeProjects.length !== 1 ? 's' : ''}</span>
            <span>{completedProjects.length} concluído{completedProjects.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {resellerProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <FolderOpen className="w-8 h-8 mb-2 text-gray-300" />
            <p className="text-sm">Nenhum projeto vinculado a este revendedor.</p>
          </div>
        ) : (
          <div>
            {resellerProjects.map(p => {
              const client  = clients.find(c => c.id === p.clientId)
              const subType = substationTypes.find(t => t.id === p.substationTypeId)
              const daysLeft = getDaysLeft(p.plannedEndDate)
              const completedCount = p.stages.filter(s => s.status === 'COMPLETED').length
              const totalActive    = p.stages.filter(s => s.status !== 'SKIPPED').length
              const progress = totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 0

              const statusColors: Record<string, string> = {
                IN_PROGRESS: 'bg-blue-100 text-blue-700',
                WAITING:     'bg-yellow-100 text-yellow-700',
                COMPLETED:   'bg-green-100 text-green-700',
                CANCELLED:   'bg-gray-100 text-gray-500',
              }
              const statusLabels: Record<string, string> = {
                IN_PROGRESS: 'Em Andamento',
                WAITING:     'Aguardando',
                COMPLETED:   'Concluído',
                CANCELLED:   'Cancelado',
              }

              return (
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-5 py-3 border-t hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{p.title}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {client?.name ?? '—'} · {subType?.name ?? '—'}
                    </p>
                  </div>

                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', statusColors[p.status])}>
                    {statusLabels[p.status]}
                  </span>

                  <div className="flex items-center gap-1.5 w-24 shrink-0">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${progress}%`, backgroundColor: 'var(--color-primary)' }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{progress}%</span>
                  </div>

                  {daysLeft !== null && p.status !== 'COMPLETED' && p.status !== 'CANCELLED' && (
                    <span className={clsx('text-xs font-semibold shrink-0',
                      daysLeft < 0 ? 'text-red-500' : daysLeft <= 15 ? 'text-yellow-500' : 'text-green-600'
                    )}>
                      {daysLeft < 0 ? `${Math.abs(daysLeft)}d atr.` : `${daysLeft}d`}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
