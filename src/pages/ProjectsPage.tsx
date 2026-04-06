import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FolderOpen, Plus, Search, ChevronRight, Clock, CheckCircle2,
  AlertTriangle, XCircle, Calendar, User, Building2, Trash2, Filter
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { STATUS_LABELS, type ProjectStatus } from '../types'
import clsx from 'clsx'


// ─── helpers ──────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<ProjectStatus, string> = {
  IN_PROGRESS: 'blue', WAITING: 'yellow', COMPLETED: 'green', CANCELLED: 'red',
}


const STATUS_STYLE: Record<ProjectStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  IN_PROGRESS: {
    bg: 'var(--color-blue-highlight)',
    text: 'var(--color-blue)',
    icon: <Clock className="w-3 h-3" />,
  },
  WAITING: {
    bg: 'var(--color-warning-highlight)',
    text: 'var(--color-warning)',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  COMPLETED: {
    bg: 'var(--color-success-highlight)',
    text: 'var(--color-success)',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  CANCELLED: {
    bg: 'var(--color-error-highlight)',
    text: 'var(--color-error)',
    icon: <XCircle className="w-3 h-3" />,
  },
}


function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}


// ─── Componente principal ─────────────────────────────────────────────────────
export default function ProjectsPage() {
  const navigate = useNavigate()
  const { projects, clients, resellers, substationTypes, requestTypes, deleteProject } = useApp()


  const [search, setSearch]                       = useState('')
  const [filterStatus, setFilterStatus]           = useState<ProjectStatus | ''>('')
  const [filterReseller, setFilterReseller]       = useState('')
  const [filterRequestType, setFilterRequestType] = useState('')
  const [sortBy, setSortBy]                       = useState<'recent' | 'deadline' | 'progress'>('recent')


  // ── Filtro + ordenação ──────────────────────────────────────────────────────
  const filtered = projects
    .filter(p => {
      const client       = clients.find(c => c.id === p.clientId)
      const reseller     = resellers.find(r => r.id === p.resellerId)
      const subType      = substationTypes.find(t => t.id === p.substationTypeId)
      const q = search.toLowerCase()
      const matchSearch  = !q ||
        p.title.toLowerCase().includes(q) ||
        (client?.name ?? '').toLowerCase().includes(q) ||
        (reseller?.name ?? '').toLowerCase().includes(q) ||
        (subType?.name ?? '').toLowerCase().includes(q) ||
        p.concessionaria.toLowerCase().includes(q)
      const matchStatus      = !filterStatus      || p.status === filterStatus
      const matchReseller    = !filterReseller    || p.resellerId === filterReseller
      const matchRequestType = !filterRequestType || p.requestTypeId === filterRequestType
      return matchSearch && matchStatus && matchReseller && matchRequestType
    })
    .sort((a, b) => {
      if (sortBy === 'recent')   return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === 'deadline') {
        const da = a.plannedEndDate ? new Date(a.plannedEndDate).getTime() : Infinity
        const db = b.plannedEndDate ? new Date(b.plannedEndDate).getTime() : Infinity
        return da - db
      }
      // progress
      const progA = a.stages.filter(s => s.status !== 'SKIPPED').length
        ? Math.round(a.stages.filter(s => s.status === 'COMPLETED').length / a.stages.filter(s => s.status !== 'SKIPPED').length * 100) : 0
      const progB = b.stages.filter(s => s.status !== 'SKIPPED').length
        ? Math.round(b.stages.filter(s => s.status === 'COMPLETED').length / b.stages.filter(s => s.status !== 'SKIPPED').length * 100) : 0
      return progB - progA
    })


  // ── Stats ───────────────────────────────────────────────────────────────────
  const total      = projects.length
  const inProgress = projects.filter(p => p.status === 'IN_PROGRESS').length
  const waiting    = projects.filter(p => p.status === 'WAITING').length
  const completed  = projects.filter(p => p.status === 'COMPLETED').length
  const overdue    = projects.filter(p => {
    if (!p.plannedEndDate || p.status === 'COMPLETED' || p.status === 'CANCELLED') return false
    return new Date(p.plannedEndDate).getTime() < Date.now()
  }).length


  const sel = 'text-sm font-medium px-3 py-2 rounded-lg border focus:outline-none'


  return (
    <div className="p-6 space-y-6">


      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>Projetos</h1>
        </div>
        <button onClick={() => navigate('/projects/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: 'var(--color-primary)' }}>
          <Plus className="w-4 h-4" /> Novo Projeto
        </button>
      </div>


      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total',        value: total,      color: 'var(--color-text)',    bg: 'var(--color-surface)' },
          { label: 'Em Andamento', value: inProgress, color: 'var(--color-blue)',    bg: 'var(--color-blue-highlight)' },
          { label: 'Aguardando',   value: waiting,    color: 'var(--color-warning)', bg: 'var(--color-warning-highlight)' },
          { label: 'Concluídos',   value: completed,  color: 'var(--color-success)', bg: 'var(--color-success-highlight)' },
          { label: 'Atrasados',    value: overdue,    color: overdue > 0 ? 'var(--color-error)' : 'var(--color-text-muted)', bg: overdue > 0 ? 'var(--color-error-highlight)' : 'var(--color-surface)' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4"
            style={{ border: '1px solid var(--color-border)', background: s.bg }}>
            <p className="text-xs uppercase tracking-wide font-medium" style={{ color: 'var(--color-text-muted)' }}>
              {s.label}
            </p>
            <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>


      {/* ── Filtros ── */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Busca */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por título, cliente, revendedor, tipo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
          />
        </div>


        {/* Status */}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as ProjectStatus | '')}
          className={sel} style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
          <option value="">Todos os status</option>
          <option value="IN_PROGRESS">Em Andamento</option>
          <option value="WAITING">Aguardando</option>
          <option value="COMPLETED">Concluído</option>
          <option value="CANCELLED">Cancelado</option>
        </select>


        {/* Revendedor */}
        <select value={filterReseller} onChange={e => setFilterReseller(e.target.value)}
          className={sel} style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
          <option value="">Todos os revendedores</option>
          {resellers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>


        {/* Tipo de Solicitação */}
        <select value={filterRequestType} onChange={e => setFilterRequestType(e.target.value)}
          className={sel} style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
          <option value="">Todos os tipos</option>
          {requestTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
        </select>


        {/* Ordenação */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className={sel} style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
          <option value="recent">Mais recentes</option>
          <option value="deadline">Prazo mais próximo</option>
          <option value="progress">Maior progresso</option>
        </select>
      </div>


      {/* ── Lista ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--color-text-muted)' }}>
          <FolderOpen className="w-12 h-12 mb-3" style={{ color: 'var(--color-text-faint)' }} />
          <p className="font-medium text-base" style={{ color: 'var(--color-text)' }}>
            {projects.length === 0 ? 'Nenhum projeto cadastrado ainda.' : 'Nenhum projeto encontrado.'}
          </p>
          <p className="text-sm mt-1">
            {projects.length === 0
              ? 'Clique em "Novo Projeto" para começar.'
              : 'Tente ajustar os filtros de busca.'}
          </p>
          {projects.length === 0 && (
            <button onClick={() => navigate('/projects/new')}
              className="mt-4 flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-medium"
              style={{ background: 'var(--color-primary)' }}>
              <Plus className="w-4 h-4" /> Novo Projeto
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Contador de resultados */}
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {filtered.length} projeto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </p>


          {filtered.map(p => {
            const client       = clients.find(c => c.id === p.clientId)
            const reseller     = resellers.find(r => r.id === p.resellerId)
            const subType      = substationTypes.find(t => t.id === p.substationTypeId)
            const requestType  = requestTypes.find(rt => rt.id === p.requestTypeId)
            const activeStages = p.stages.filter(s => s.status !== 'SKIPPED').length
            const doneStages   = p.stages.filter(s => s.status === 'COMPLETED').length
            const progress     = activeStages > 0 ? Math.round(doneStages / activeStages * 100) : 0
            const currentStage = p.stages.find(s => s.stageNumber === p.currentStage)
            const daysLeft     = p.plannedEndDate
              ? Math.ceil((new Date(p.plannedEndDate).getTime() - Date.now()) / 86400000)
              : null
            const isOverdue    = daysLeft !== null && daysLeft < 0 && p.status !== 'COMPLETED' && p.status !== 'CANCELLED'
            const st = STATUS_STYLE[p.status]


            return (
              <div key={p.id}
                className="rounded-xl transition-shadow hover:shadow-md group"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>


                <Link to={`/projects/${p.id}`} className="block p-4">
                  <div className="flex items-start gap-4">


                    {/* Ícone de status */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: st.bg, color: st.text }}>
                      {st.icon}
                    </div>


                    {/* Conteúdo principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <p className="font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                            {p.title}
                          </p>
                          <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                            {[subType?.name, p.transformerKva ? `${p.transformerKva} kVA` : null, p.concessionaria]
                              .filter(Boolean).join(' · ')}
                          </p>
                        </div>


                        {/* Badge status + dias */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {requestType && (
                            <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full"
                              style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' }}>
                              {requestType.name}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                            style={{ background: st.bg, color: st.text }}>
                            {st.icon}
                            {STATUS_LABELS[p.status]}
                          </span>
                          {daysLeft !== null && p.status !== 'COMPLETED' && p.status !== 'CANCELLED' && (
                            <span className={clsx('text-xs font-medium px-2 py-1 rounded-full', {
                              'text-red-600 bg-red-50':       isOverdue,
                              'text-yellow-600 bg-yellow-50': !isOverdue && daysLeft <= 15,
                              'text-gray-500 bg-gray-100':    !isOverdue && daysLeft > 15,
                            })}>
                              {isOverdue ? `${Math.abs(daysLeft)}d atrasado` : `${daysLeft}d restantes`}
                            </span>
                          )}
                        </div>
                      </div>


                      {/* Info secundária */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs"
                        style={{ color: 'var(--color-text-muted)' }}>
                        {client && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />{client.name}
                          </span>
                        )}
                        {reseller && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />{reseller.name}
                          </span>
                        )}
                        {p.startDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Início: {formatDate(p.startDate)}
                          </span>
                        )}
                        {p.plannedEndDate && (
                          <span className="flex items-center gap-1"
                            style={{ color: isOverdue ? 'var(--color-error)' : 'inherit' }}>
                            <Calendar className="w-3 h-3" />
                            Prazo: {formatDate(p.plannedEndDate)}
                          </span>
                        )}
                      </div>


                      {/* Etapa atual */}
                      {currentStage && p.status === 'IN_PROGRESS' && (
                        <p className="text-xs mt-1.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                          <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                            Etapa {p.currentStage}:
                          </span>{' '}
                          {currentStage.title}
                        </p>
                      )}


                      {/* Barra de progresso */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                          <span>{progress}% concluído</span>
                          <span>{doneStages}/{activeStages} etapas</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-offset)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${progress}%`,
                              background: p.status === 'COMPLETED'
                                ? 'var(--color-success)'
                                : p.status === 'CANCELLED'
                                ? 'var(--color-text-faint)'
                                : 'var(--color-primary)',
                            }}
                          />
                        </div>
                      </div>
                    </div>


                    {/* Seta + delete */}
                    <div className="flex flex-col items-center gap-2 shrink-0 self-center">
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </div>
                </Link>


                {/* Footer do card com botão excluir */}
                <div className="flex items-center justify-end px-4 pb-3 -mt-1">
                  <button
                    onClick={e => {
                      e.preventDefault()
                      if (confirm(`Excluir projeto "${p.title}"?`)) deleteProject(p.id)
                    }}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors hover:bg-red-50 hover:text-red-500"
                    style={{ color: 'var(--color-text-faint)' }}
                    aria-label="Excluir projeto">
                    <Trash2 className="w-3 h-3" /> Excluir
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
