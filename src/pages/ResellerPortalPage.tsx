import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { STATUS_LABELS, type Project, type ProjectStatus } from '../types'
import { AlertTriangle, Clock, LayoutGrid, List } from 'lucide-react'
import clsx from 'clsx'


// ── Helpers ────────────────────────────────────────────────────────────────
function getDaysLeft(iso?: string): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}


type AlertLevel = 'overdue' | 'warning' | 'ok' | 'none'


function getProjectAlert(project: Project): AlertLevel {
  if (project.status === 'COMPLETED' || project.status === 'CANCELLED') return 'none'
  const daysLeft = getDaysLeft(project.plannedEndDate)
  if (daysLeft === null) return 'none'
  if (daysLeft < 0) return 'overdue'
  if (daysLeft <= 15) return 'warning'
  return 'ok'
}


function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}


function getProjectMacroPhase(project: Project): string | null {
  if (project.status === 'COMPLETED') return null
  const activeStages = project.stages
    .filter(s => s.status !== 'SKIPPED')
    .sort((a, b) => a.stageNumber - b.stageNumber)
  const firstPending = activeStages.find(s => s.status !== 'COMPLETED')
  return firstPending?.macroPhaseId ?? activeStages[activeStages.length - 1]?.macroPhaseId ?? null
}


// ── Componente principal ───────────────────────────────────────────────────
export default function ResellerPortalPage() {
  const { projects, clients, substationTypes, macroPhases, resellers, requestTypes } = useApp()
  const navigate = useNavigate()
  const [view, setView] = useState<'phase' | 'list'>('phase')
  const [filterReseller, setFilterReseller] = useState('')
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | ''>('')
  const [filterRequestType, setFilterRequestType] = useState('')


  const activeProjects = projects
    .filter(p => p.status !== 'CANCELLED')
    .filter(p => !filterReseller    || p.resellerId    === filterReseller)
    .filter(p => !filterStatus      || p.status        === filterStatus)
    .filter(p => !filterRequestType || p.requestTypeId === filterRequestType)


  const sortedPhases = [...macroPhases].sort((a, b) => a.order - b.order)

  const overdueCount = activeProjects.filter(p => getProjectAlert(p) === 'overdue').length
  const warningCount = activeProjects.filter(p => getProjectAlert(p) === 'warning').length


  return (
    <div>
      {/* ── Cabeçalho ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Portal de projetos</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Acompanhe o andamento dos projetos em tempo real.
          </p>
        </div>
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
          <button onClick={() => setView('phase')}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              view === 'phase' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <LayoutGrid size={15} /> Fases
          </button>
          <button onClick={() => setView('list')}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              view === 'list' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <List size={15} /> Lista
          </button>
        </div>
      </div>


      {/* ── Alertas ─────────────────────────────────────────────────────── */}
      {(overdueCount > 0 || warningCount > 0) && (
        <div className="flex gap-3 mb-5 flex-wrap">
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              <AlertTriangle size={16} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700 font-medium">
                {overdueCount} projeto{overdueCount > 1 ? 's' : ''} com prazo vencido
              </p>
            </div>
          )}
          {warningCount > 0 && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5">
              <Clock size={16} className="text-yellow-500 shrink-0" />
              <p className="text-sm text-yellow-700 font-medium">
                {warningCount} projeto{warningCount > 1 ? 's' : ''} próximo{warningCount > 1 ? 's' : ''} do vencimento
              </p>
            </div>
          )}
        </div>
      )}


      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <select value={filterReseller} onChange={e => setFilterReseller(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 bg-white">
          <option value="">Todos os revendedores</option>
          {resellers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as ProjectStatus | '')}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 bg-white">
          <option value="">Todos os status</option>
          {(['IN_PROGRESS', 'WAITING', 'COMPLETED'] as ProjectStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        {/* Tipo de Solicitação */}
        <select value={filterRequestType} onChange={e => setFilterRequestType(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 bg-white">
          <option value="">Todos os tipos</option>
          {requestTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
        </select>

        <div className="flex items-center gap-4 ml-1">
          <AlertDot color="red"    label="Vencido" />
          <AlertDot color="yellow" label="Vencendo em breve" />
          <AlertDot color="green"  label="Em dia" />
        </div>
      </div>


      {activeProjects.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-sm">Nenhum projeto encontrado.</p>
        </div>
      )}


      {/* ── Fases ──────────────────────────────────────────────────────── */}
      {view === 'phase' && activeProjects.length > 0 && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4" style={{ minWidth: `${(sortedPhases.length + 1) * 272}px` }}>
            {sortedPhases.map(phase => {
              const phaseProjects = activeProjects.filter(p =>
                getProjectMacroPhase(p) === phase.id
              )
              return (
                <div key={phase.id} className="flex-1 min-w-[256px]">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: phase.color }} />
                    <h3 className="font-semibold text-gray-700 text-sm truncate">{phase.name}</h3>
                    <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                      {phaseProjects.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {phaseProjects.map(p => (
                      <ProjectCard key={p.id} project={p}
                        client={clients.find(c => c.id === p.clientId)}
                        substationType={substationTypes.find(t => t.id === p.substationTypeId)}
                        requestTypeName={requestTypes.find(rt => rt.id === p.requestTypeId)?.name}
                        phaseColor={phase.color}
                        onClick={() => navigate(`/projects/${p.id}`)} />
                    ))}
                    {phaseProjects.length === 0 && (
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                        <p className="text-xs text-gray-300">Nenhum projeto</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Coluna sem fase */}
            {(() => {
              const unphased = activeProjects.filter(p => {
                const mp = getProjectMacroPhase(p)
                return !mp || !sortedPhases.find(ph => ph.id === mp)
              })
              if (unphased.length === 0) return null
              return (
                <div className="flex-1 min-w-[256px]">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-3 h-3 rounded-full bg-gray-300 shrink-0" />
                    <h3 className="font-semibold text-gray-500 text-sm">Sem Fase</h3>
                    <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {unphased.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {unphased.map(p => (
                      <ProjectCard key={p.id} project={p}
                        client={clients.find(c => c.id === p.clientId)}
                        substationType={substationTypes.find(t => t.id === p.substationTypeId)}
                        requestTypeName={requestTypes.find(rt => rt.id === p.requestTypeId)?.name}
                        phaseColor="#9ca3af"
                        onClick={() => navigate(`/projects/${p.id}`)} />
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}


      {/* ── Lista ───────────────────────────────────────────────────────── */}
      {view === 'list' && activeProjects.length > 0 && (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="grid grid-cols-13 gap-2 px-5 py-3 bg-gray-50 border-b text-xs font-semibold text-gray-400 uppercase tracking-wider"
            style={{ gridTemplateColumns: '2.5% 22% 14% 13% 16% 16% 8% 8%' }}>
            <div></div>
            <div>Projeto</div>
            <div>Cliente</div>
            <div>Tipo Solicitação</div>
            <div>Fase Atual</div>
            <div>Etapa Atual</div>
            <div className="text-center">Prazo</div>
            <div className="text-center">Progresso</div>
          </div>

          {[...activeProjects]
            .sort((a, b) => {
              const order = { overdue: 0, warning: 1, ok: 2, none: 3 }
              return order[getProjectAlert(a)] - order[getProjectAlert(b)]
            })
            .map(p => {
              const client         = clients.find(c => c.id === p.clientId)
              const substationType = substationTypes.find(t => t.id === p.substationTypeId)
              const requestType    = requestTypes.find(rt => rt.id === p.requestTypeId)
              const macroPhaseId   = getProjectMacroPhase(p)
              const phase          = macroPhases.find(m => m.id === macroPhaseId)
              const activeStages   = p.stages.filter(s => s.status !== 'SKIPPED').sort((a, b) => a.stageNumber - b.stageNumber)
              const firstPending   = activeStages.find(s => s.status !== 'COMPLETED')
              const alert          = getProjectAlert(p)
              const daysLeft       = getDaysLeft(p.plannedEndDate)
              const completedCount = p.stages.filter(s => s.status === 'COMPLETED').length
              const totalActive    = p.stages.filter(s => s.status !== 'SKIPPED').length
              const progress       = totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 0

              return (
                <div key={p.id}
                  className="grid gap-2 px-5 py-3 items-center border-t hover:bg-gray-50 transition-colors cursor-pointer"
                  style={{ gridTemplateColumns: '2.5% 22% 14% 13% 16% 16% 8% 8%' }}
                  onClick={() => navigate(`/projects/${p.id}`)}>

                  <div className="flex justify-center">
                    <AlertIndicator level={alert} />
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate text-sm">{p.title}</p>
                    <p className="text-xs text-gray-400 truncate">{substationType?.name ?? '—'}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 truncate">{client?.name ?? '—'}</p>
                  </div>

                  <div className="min-w-0">
                    {requestType ? (
                      <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600 truncate max-w-full">
                        {requestType.name}
                      </span>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </div>

                  <div>
                    {phase ? (
                      <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full text-white"
                        style={{ backgroundColor: phase.color }}>
                        {phase.name}
                      </span>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-gray-600 truncate">
                      {firstPending ? `${firstPending.stageNumber}. ${firstPending.title}` : '—'}
                    </p>
                  </div>

                  <div className="text-center">
                    {daysLeft !== null ? (
                      <span className={clsx('text-xs font-semibold',
                        daysLeft < 0 ? 'text-red-500' :
                        daysLeft <= 15 ? 'text-yellow-500' :
                        'text-green-600')}>
                        {daysLeft < 0 ? `${Math.abs(daysLeft)}d atr.` : `${daysLeft}d`}
                      </span>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{progress}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}


// ── Card por fase ─────────────────────────────────────────────────────────
function ProjectCard({ project, client, substationType, requestTypeName, phaseColor, onClick }: {
  project: Project
  client: { name: string } | undefined
  substationType: { name: string } | undefined
  requestTypeName: string | undefined
  phaseColor: string
  onClick: () => void
}) {
  const alert          = getProjectAlert(project)
  const daysLeft       = getDaysLeft(project.plannedEndDate)
  const activeStages   = project.stages.filter(s => s.status !== 'SKIPPED').sort((a, b) => a.stageNumber - b.stageNumber)
  const firstPending   = activeStages.find(s => s.status !== 'COMPLETED')
  const completedCount = project.stages.filter(s => s.status === 'COMPLETED').length
  const totalActive    = project.stages.filter(s => s.status !== 'SKIPPED').length
  const progress       = totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 0

  const alertTone =
    alert === 'overdue' ? 'border-red-200 bg-red-50 text-red-700' :
    alert === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-700' :
    'border-emerald-200 bg-emerald-50 text-emerald-700'

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: phaseColor }} />

      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-bold leading-snug text-slate-950">
            {project.title}
          </p>
          <p className="mt-1 truncate text-xs font-medium text-slate-500">
            {substationType?.name ?? 'Sem tipo definido'}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
          {progress}%
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: phaseColor }} />
          <span className="truncate">{client?.name ?? 'Cliente não informado'}</span>
        </div>

        {requestTypeName && (
          <span className="inline-flex max-w-full items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            <span className="truncate">{requestTypeName}</span>
          </span>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Etapa atual</p>
        <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-slate-700">
          {firstPending
            ? `${firstPending.stageNumber}. ${firstPending.title}`
            : 'Todas concluídas'}
        </p>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500">{completedCount}/{totalActive} etapas</span>
          {daysLeft !== null && (
            <span className={clsx('rounded-full border px-2 py-0.5 text-[11px] font-bold', alertTone)}>
              {daysLeft < 0 ? `${Math.abs(daysLeft)}d atraso` : `${daysLeft}d restantes`}
            </span>
          )}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, backgroundColor: phaseColor }}
          />
        </div>
      </div>
    </button>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────────────────
function AlertIndicator({ level }: { level: AlertLevel }) {
  if (level === 'overdue') return <div className="w-3 h-3 rounded-full bg-red-500" title="Prazo vencido" />
  if (level === 'warning') return <div className="w-3 h-3 rounded-full bg-yellow-400" title="Prazo próximo" />
  if (level === 'ok')      return <div className="w-3 h-3 rounded-full bg-green-400" title="Em dia" />
  return <div className="w-3 h-3 rounded-full bg-gray-200" />
}


function AlertDot({ color, label }: { color: 'red' | 'yellow' | 'green'; label: string }) {
  const colors = { red: 'bg-red-500', yellow: 'bg-yellow-400', green: 'bg-green-400' }
  return (
    <div className="flex items-center gap-1.5">
      <div className={clsx('w-2.5 h-2.5 rounded-full', colors[color])} />
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  )
}
