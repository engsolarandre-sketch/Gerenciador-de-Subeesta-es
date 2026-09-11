import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  FolderOpen,
  Gauge,
  Layers3,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  User,
  XCircle,
} from 'lucide-react'
import clsx from 'clsx'
import { useApp } from '../context/AppContext'
import { STATUS_LABELS, type Project, type ProjectStatus } from '../types'

type SortOption = 'recent' | 'deadline' | 'progress' | 'risk'

type EnrichedProject = {
  project: Project
  client?: { id: string; name: string }
  reseller?: { id: string; name: string }
  substationType?: { id: string; name: string }
  requestType?: { id: string; name: string }
  currentStage?: Project['stages'][number]
  currentPhase?: { id: string; name: string; color: string }
  progress: { done: number; total: number; percent: number }
  daysLeft: number | null
  riskScore: number
}

const STATUS_STYLE: Record<ProjectStatus, { bg: string; text: string; border: string; icon: ReactNode }> = {
  IN_PROGRESS: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-100',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  WAITING: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-100',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  COMPLETED: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-100',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  CANCELLED: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-100',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
}

function formatDate(iso?: string) {
  if (!iso) return 'Sem prazo'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getProgress(project: Project) {
  const activeStages = project.stages.filter(stage => stage.status !== 'SKIPPED')
  if (activeStages.length === 0) return { done: 0, total: 0, percent: 0 }

  const done = activeStages.filter(stage => stage.status === 'COMPLETED').length
  return { done, total: activeStages.length, percent: Math.round((done / activeStages.length) * 100) }
}

function getDaysLeft(project: Project) {
  if (!project.plannedEndDate || project.status === 'COMPLETED' || project.status === 'CANCELLED') return null
  return Math.ceil((new Date(project.plannedEndDate).getTime() - Date.now()) / 86400000)
}

function getRiskScore(project: Project) {
  const daysLeft = getDaysLeft(project)
  const waitingStages = project.stages.filter(stage => stage.status === 'WAITING_APPROVAL').length
  const progress = getProgress(project).percent

  if (project.status === 'CANCELLED' || project.status === 'COMPLETED') return -1
  let score = waitingStages * 8
  if (project.status === 'WAITING') score += 20
  if (daysLeft !== null && daysLeft < 0) score += 40
  if (daysLeft !== null && daysLeft <= 15) score += 15
  if (progress < 30) score += 5
  return score
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { projects, clients, resellers, substationTypes, requestTypes, macroPhases, deleteProject } = useApp()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | ''>('')
  const [filterReseller, setFilterReseller] = useState('')
  const [filterRequestType, setFilterRequestType] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('risk')

  const enrichedProjects = useMemo<EnrichedProject[]>(() => projects.map(project => {
    const client = clients.find(item => item.id === project.clientId)
    const reseller = resellers.find(item => item.id === project.resellerId)
    const substationType = substationTypes.find(item => item.id === project.substationTypeId)
    const requestType = requestTypes.find(item => item.id === project.requestTypeId)
    const currentStage = project.stages.find(stage => stage.stageNumber === project.currentStage)
    const currentPhase = macroPhases.find(phase => phase.id === currentStage?.macroPhaseId)

    return {
      project,
      client,
      reseller,
      substationType,
      requestType,
      currentStage,
      currentPhase,
      progress: getProgress(project),
      daysLeft: getDaysLeft(project),
      riskScore: getRiskScore(project),
    }
  }), [clients, macroPhases, projects, requestTypes, resellers, substationTypes])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return enrichedProjects
      .filter(item => {
        const { project, client, reseller, substationType, requestType } = item
        const matchesSearch = !query || [
          project.title,
          client?.name,
          reseller?.name,
          substationType?.name,
          requestType?.name,
          project.concessionaria,
        ].some(value => (value ?? '').toLowerCase().includes(query))

        return matchesSearch &&
          (!filterStatus || project.status === filterStatus) &&
          (!filterReseller || project.resellerId === filterReseller) &&
          (!filterRequestType || project.requestTypeId === filterRequestType)
      })
      .sort((a, b) => {
        if (sortBy === 'deadline') {
          const deadlineA = a.project.plannedEndDate ? new Date(a.project.plannedEndDate).getTime() : Infinity
          const deadlineB = b.project.plannedEndDate ? new Date(b.project.plannedEndDate).getTime() : Infinity
          return deadlineA - deadlineB
        }
        if (sortBy === 'progress') return b.progress.percent - a.progress.percent
        if (sortBy === 'risk') return b.riskScore - a.riskScore
        return new Date(b.project.createdAt).getTime() - new Date(a.project.createdAt).getTime()
      })
  }, [enrichedProjects, filterRequestType, filterReseller, filterStatus, search, sortBy])

  const portfolio = useMemo(() => {
    const active = enrichedProjects.filter(item => item.project.status !== 'COMPLETED' && item.project.status !== 'CANCELLED')
    const overdue = active.filter(item => item.daysLeft !== null && item.daysLeft < 0)
    const dueSoon = active.filter(item => item.daysLeft !== null && item.daysLeft >= 0 && item.daysLeft <= 15)
    const averageProgress = active.length
      ? Math.round(active.reduce((sum, item) => sum + item.progress.percent, 0) / active.length)
      : 0
    const phaseLoad = macroPhases.map(phase => ({
      phase,
      total: active.filter(item => item.currentPhase?.id === phase.id).length,
    })).filter(item => item.total > 0)
    const nextDeadlines = active
      .filter(item => item.project.plannedEndDate)
      .sort((a, b) => new Date(a.project.plannedEndDate ?? '').getTime() - new Date(b.project.plannedEndDate ?? '').getTime())
      .slice(0, 4)

    return { active, overdue, dueSoon, averageProgress, phaseLoad, nextDeadlines }
  }, [enrichedProjects, macroPhases])

  const hasFilters = Boolean(search || filterStatus || filterReseller || filterRequestType)

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
          <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                  <Gauge className="h-3.5 w-3.5" />
                  Carteira técnica
                </div>
                <h1 className="mt-3 text-2xl font-bold text-slate-950">Projetos</h1>
                <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  Controle prazos, responsáveis, etapas e riscos dos projetos de subestação em uma visão operacional.
                </p>
              </div>

              <button
                onClick={() => navigate('/projects/new')}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
              >
                <Plus className="h-4 w-4" />
                Novo projeto
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Ativos" value={portfolio.active.length} icon={<FolderOpen className="h-4 w-4" />} tone="teal" />
              <MetricCard label="Atrasados" value={portfolio.overdue.length} icon={<AlertTriangle className="h-4 w-4" />} tone="rose" />
              <MetricCard label="Vencem em breve" value={portfolio.dueSoon.length} icon={<Calendar className="h-4 w-4" />} tone="amber" />
              <MetricCard label="Progresso médio" value={`${portfolio.averageProgress}%`} icon={<BarChart3 className="h-4 w-4" />} tone="blue" />
            </div>
          </div>

          <aside className="bg-slate-950 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Atenção da semana</p>
                <p className="mt-1 text-lg font-bold">Prioridade por prazo</p>
              </div>
              <SlidersHorizontal className="h-5 w-5 text-teal-300" />
            </div>

            <div className="mt-5 space-y-3">
              {portfolio.nextDeadlines.length === 0 ? (
                <p className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  Nenhum prazo ativo cadastrado.
                </p>
              ) : portfolio.nextDeadlines.map(item => (
                <Link
                  key={item.project.id}
                  to={`/projects/${item.project.id}`}
                  className="group block rounded-lg border border-white/10 bg-white/[0.04] p-3 transition hover:border-teal-300/40 hover:bg-white/[0.08]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.project.title}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatDate(item.project.plannedEndDate)}</p>
                    </div>
                    <span className={clsx('shrink-0 rounded-full px-2 py-1 text-xs font-semibold', {
                      'bg-rose-400/15 text-rose-200': item.daysLeft !== null && item.daysLeft < 0,
                      'bg-amber-400/15 text-amber-200': item.daysLeft !== null && item.daysLeft >= 0 && item.daysLeft <= 15,
                      'bg-teal-400/15 text-teal-200': item.daysLeft !== null && item.daysLeft > 15,
                    })}>
                      {item.daysLeft !== null && item.daysLeft < 0 ? `${Math.abs(item.daysLeft)}d atraso` : `${item.daysLeft ?? '-'}d`}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative min-w-[240px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por projeto, cliente, revendedor, tipo ou concessionária"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-3 focus:ring-teal-100"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <Select value={filterStatus} onChange={value => setFilterStatus(value as ProjectStatus | '')}>
                  <option value="">Status</option>
                  <option value="IN_PROGRESS">Em andamento</option>
                  <option value="WAITING">Aguardando</option>
                  <option value="COMPLETED">Concluído</option>
                  <option value="CANCELLED">Cancelado</option>
                </Select>

                <Select value={filterReseller} onChange={setFilterReseller}>
                  <option value="">Revendedor</option>
                  {resellers.map(reseller => <option key={reseller.id} value={reseller.id}>{reseller.name}</option>)}
                </Select>

                <Select value={filterRequestType} onChange={setFilterRequestType}>
                  <option value="">Tipo</option>
                  {requestTypes.map(requestType => <option key={requestType.id} value={requestType.id}>{requestType.name}</option>)}
                </Select>

                <Select value={sortBy} onChange={value => setSortBy(value as SortOption)}>
                  <option value="risk">Maior risco</option>
                  <option value="deadline">Prazo próximo</option>
                  <option value="progress">Maior progresso</option>
                  <option value="recent">Mais recentes</option>
                </Select>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                {filtered.length} de {projects.length} projetos
              </span>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setFilterStatus('')
                    setFilterReseller('')
                    setFilterRequestType('')
                  }}
                  className="font-semibold text-teal-700 hover:text-teal-800"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState hasProjects={projects.length > 0} onCreate={() => navigate('/projects/new')} />
          ) : (
            <div className="grid gap-3">
              {filtered.map(item => (
                <ProjectRow key={item.project.id} item={item} onDelete={deleteProject} />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-950">Distribuição por fase</p>
                <p className="text-xs text-slate-500">Onde a carteira está concentrada</p>
              </div>
              <Layers3 className="h-4 w-4 text-teal-600" />
            </div>

            <div className="mt-4 space-y-3">
              {portfolio.phaseLoad.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Sem projetos ativos por fase.</p>
              ) : portfolio.phaseLoad.map(({ phase, total }) => {
                const width = portfolio.active.length ? Math.max(8, Math.round((total / portfolio.active.length) * 100)) : 0
                return (
                  <div key={phase.id}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{phase.name}</span>
                      <span className="text-slate-500">{total}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: `#${phase.color}` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-slate-950">Boas práticas aplicadas</p>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <PracticeItem title="Triagem por risco" description="A ordenação padrão prioriza atraso, bloqueios e aprovações pendentes." />
              <PracticeItem title="Carteira executiva" description="Métricas no topo mostram saúde, prazo e avanço médio da operação." />
              <PracticeItem title="Controle por fase" description="A lateral revela gargalos por macrofase do processo elétrico." />
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}

function MetricCard({ label, value, icon, tone }: { label: string; value: ReactNode; icon: ReactNode; tone: 'teal' | 'rose' | 'amber' | 'blue' }) {
  const tones = {
    teal: 'bg-teal-50 text-teal-700 border-teal-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className={clsx('inline-flex h-8 w-8 items-center justify-center rounded-lg border', tones[tone])}>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase text-slate-500">{label}</p>
    </div>
  )
}

function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-teal-500 focus:ring-3 focus:ring-teal-100"
    >
      {children}
    </select>
  )
}

function EmptyState({ hasProjects, onCreate }: { hasProjects: boolean; onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <FolderOpen className="h-5 w-5" />
      </div>
      <p className="mt-4 font-bold text-slate-950">{hasProjects ? 'Nenhum projeto encontrado' : 'Nenhum projeto cadastrado'}</p>
      <p className="mt-1 text-sm text-slate-500">
        {hasProjects ? 'Ajuste os filtros para ampliar a busca.' : 'Crie o primeiro projeto para iniciar a carteira.'}
      </p>
      {!hasProjects && (
        <button
          onClick={onCreate}
          className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          Novo projeto
        </button>
      )}
    </div>
  )
}

function PracticeItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  )
}

function ProjectRow({ item, onDelete }: { item: EnrichedProject; onDelete: (id: string) => void }) {
  const { project, client, reseller, substationType, requestType, currentStage, currentPhase, progress, daysLeft, riskScore } = item
  const status = STATUS_STYLE[project.status]
  const isOverdue = daysLeft !== null && daysLeft < 0
  const dueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 15

  return (
    <article className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md">
      <Link to={`/projects/${project.id}`} className="block p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 gap-3">
            <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border', status.bg, status.text, status.border)}>
              {status.icon}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-sm font-bold text-slate-950">{project.title}</h2>
                <span className={clsx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold', status.bg, status.text, status.border)}>
                  {STATUS_LABELS[project.status]}
                </span>
                {riskScore >= 35 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                    <AlertTriangle className="h-3 w-3" />
                    Alta atenção
                  </span>
                )}
              </div>

              <p className="mt-1 truncate text-sm text-slate-500">
                {[substationType?.name, project.transformerKva ? `${project.transformerKva} kVA` : null, project.concessionaria]
                  .filter(Boolean)
                  .join(' · ')}
              </p>

              <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-2 xl:grid-cols-4">
                <InfoPill icon={<User className="h-3.5 w-3.5" />} label={client?.name ?? 'Cliente não informado'} />
                <InfoPill icon={<Building2 className="h-3.5 w-3.5" />} label={reseller?.name ?? 'Revendedor não informado'} />
                <InfoPill icon={<Calendar className="h-3.5 w-3.5" />} label={`Prazo: ${formatDate(project.plannedEndDate)}`} tone={isOverdue ? 'danger' : dueSoon ? 'warning' : 'default'} />
                <InfoPill icon={<Layers3 className="h-3.5 w-3.5" />} label={currentPhase?.name ?? requestType?.name ?? 'Sem fase'} />
              </div>

              {currentStage && (
                <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase text-slate-400">Etapa atual</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-700">
                    {project.currentStage}. {currentStage.title}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="w-full shrink-0 lg:w-56">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{progress.done}/{progress.total} etapas</span>
              <span className="font-bold text-slate-950">{progress.percent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={clsx('h-full rounded-full transition-all', {
                  'bg-emerald-500': project.status === 'COMPLETED',
                  'bg-slate-400': project.status === 'CANCELLED',
                  'bg-teal-600': project.status !== 'COMPLETED' && project.status !== 'CANCELLED',
                })}
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className={clsx('rounded-full px-2 py-1 text-xs font-semibold', {
                'bg-rose-50 text-rose-700': isOverdue,
                'bg-amber-50 text-amber-700': dueSoon,
                'bg-slate-100 text-slate-500': !isOverdue && !dueSoon,
              })}>
                {daysLeft === null ? 'Sem contagem' : isOverdue ? `${Math.abs(daysLeft)}d atrasado` : `${daysLeft}d restantes`}
              </span>
              <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-teal-600" />
            </div>
          </div>
        </div>
      </Link>

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
          <ArrowUpRight className="h-3.5 w-3.5" />
          Abrir detalhes do projeto
        </span>
        <button
          onClick={() => {
            if (confirm(`Excluir projeto "${project.title}"?`)) onDelete(project.id)
          }}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
          aria-label="Excluir projeto"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Excluir
        </button>
      </div>
    </article>
  )
}

function InfoPill({ icon, label, tone = 'default' }: { icon: ReactNode; label: string; tone?: 'default' | 'danger' | 'warning' }) {
  return (
    <span className={clsx('inline-flex min-w-0 items-center gap-1.5 rounded-lg border px-2.5 py-2', {
      'border-slate-100 bg-white text-slate-500': tone === 'default',
      'border-rose-100 bg-rose-50 text-rose-700': tone === 'danger',
      'border-amber-100 bg-amber-50 text-amber-700': tone === 'warning',
    })}>
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  )
}
