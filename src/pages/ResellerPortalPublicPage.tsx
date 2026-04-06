import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { STATUS_LABELS, type Project, type ProjectStatus } from '../types'
import { AlertTriangle, Clock, LayoutGrid, List, Link } from 'lucide-react'
import clsx from 'clsx'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function getProjectMacroPhase(project: Project): string | null {
  if (project.status === 'COMPLETED') return null
  const active = project.stages
    .filter(s => s.status !== 'SKIPPED')
    .sort((a, b) => a.stageNumber - b.stageNumber)
  const first = active.find(s => s.status !== 'COMPLETED')
  return first?.macroPhaseId ?? active[active.length - 1]?.macroPhaseId ?? null
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

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

// ─── Card Kanban ──────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  client,
  substationType,
  phaseColor,
}: {
  project: Project
  client: { name: string } | undefined
  substationType: { name: string } | undefined
  phaseColor: string
}) {
  const alert = getProjectAlert(project)
  const daysLeft = getDaysLeft(project.plannedEndDate)
  const activeStages = project.stages
    .filter(s => s.status !== 'SKIPPED')
    .sort((a, b) => a.stageNumber - b.stageNumber)
  const firstPending = activeStages.find(s => s.status !== 'COMPLETED')
  const completedCount = project.stages.filter(s => s.status === 'COMPLETED').length
  const totalActive = project.stages.filter(s => s.status !== 'SKIPPED').length
  const progress = totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 0

  const cardBorder =
    alert === 'overdue' ? 'border-red-300 bg-red-50/40' :
    alert === 'warning' ? 'border-yellow-300 bg-yellow-50/40' :
    'border-gray-200 bg-white'

  return (
    <div className={clsx('rounded-xl border p-4', cardBorder)}>
      {(alert === 'overdue' || alert === 'warning') && (
        <div className={clsx(
          'flex items-center gap-1.5 text-xs font-medium mb-2 pb-2 border-b',
          alert === 'overdue' ? 'text-red-600 border-red-200' : 'text-yellow-600 border-yellow-200'
        )}>
          <AlertTriangle size={12} />
          {alert === 'overdue'
            ? `Projeto vencido há ${Math.abs(daysLeft ?? 0)}d`
            : `Vence em ${daysLeft}d`}
        </div>
      )}

      <p className="font-semibold text-gray-800 text-sm leading-snug">{project.title}</p>
      <p className="text-xs text-gray-400 mt-0.5 truncate">{substationType?.name ?? ''}</p>
      <p className="text-xs text-gray-300 mt-0.5 truncate">{client?.name ?? ''}</p>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500 font-medium mb-0.5">Etapa atual</p>
        <p className="text-xs text-gray-700 leading-snug line-clamp-2">
          {firstPending
            ? `${firstPending.stageNumber}. ${firstPending.title}`
            : 'Todas concluídas'}
        </p>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{completedCount}/{totalActive} etapas</span>
          {daysLeft !== null && (
            <span className={clsx('font-medium',
              daysLeft < 0 ? 'text-red-500' : daysLeft <= 15 ? 'text-yellow-500' : 'text-green-600'
            )}>
              {daysLeft < 0 ? `${Math.abs(daysLeft)}d atrasado` : `${daysLeft}d restantes`}
            </span>
          )}
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, backgroundColor: phaseColor }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ResellerPortalPublicPage() {
  const { resellerId } = useParams<{ resellerId: string }>()
  const { projects, clients, substationTypes, macroPhases, resellers } = useApp()
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | ''>('')

  const reseller = resellers.find(r => r.id === resellerId)

  // Link inválido
  if (!reseller) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Link size={20} className="text-gray-400" />
          </div>
          <h1 className="text-lg font-bold text-gray-700 mb-1">Link inválido</h1>
          <p className="text-sm text-gray-400">
            Este link de portal não é válido ou expirou. Solicite um novo link ao responsável.
          </p>
        </div>
      </div>
    )
  }

  const activeProjects = projects
    .filter(p => p.resellerId === resellerId)
    .filter(p => p.status !== 'CANCELLED')
    .filter(p => !filterStatus || p.status === filterStatus)

  const sortedPhases = [...macroPhases].sort((a, b) => a.order - b.order)
  const overdueCount = activeProjects.filter(p => getProjectAlert(p) === 'overdue').length
  const warningCount = activeProjects.filter(p => getProjectAlert(p) === 'warning').length

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Topbar */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
            Portal do Revendedor
          </p>
          <h1 className="text-base font-bold text-gray-800 leading-tight">
            {reseller.name}
          </h1>
        </div>
        <div className="text-xs text-gray-400 hidden sm:block">
          {activeProjects.length} projeto{activeProjects.length !== 1 ? 's' : ''} ativo{activeProjects.length !== 1 ? 's' : ''}
        </div>
      </header>

      <main className="p-6 max-w-screen-2xl mx-auto">

        {/* Alertas */}
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

        {/* Filtros + toggle de view */}
        <div className="flex gap-3 mb-6 flex-wrap items-center justify-between">
          <div className="flex gap-3 flex-wrap items-center">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as ProjectStatus | '')}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 bg-white"
            >
              <option value="">Todos os status</option>
              {(['IN_PROGRESS', 'WAITING', 'COMPLETED'] as ProjectStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <div className="flex items-center gap-4 ml-1">
              <AlertDot color="red"    label="Vencido" />
              <AlertDot color="yellow" label="Vencendo em breve" />
              <AlertDot color="green"  label="Em dia" />
            </div>
          </div>

          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setView('kanban')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                view === 'kanban' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <LayoutGrid size={15} /> Kanban
            </button>
            <button
              onClick={() => setView('list')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                view === 'list' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <List size={15} /> Lista
            </button>
          </div>
        </div>

        {/* Vazio */}
        {activeProjects.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-sm">Nenhum projeto encontrado.</p>
          </div>
        )}

        {/* ── Kanban ─────────────────────────────────────────────────────────
            CORREÇÃO: removido overflow-x-auto e minWidth fixo em px.
            Usando CSS Grid com 1fr para as colunas sempre dividirem
            o espaço disponível — a scrollbar nunca aparece desnecessariamente.
        ────────────────────────────────────────────────────────────────────── */}
        {view === 'kanban' && activeProjects.length > 0 && (
          <div className="pb-4">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${sortedPhases.length + 1}, 1fr)`,
                gap: '1rem',
              }}
            >
              {sortedPhases.map(phase => {
                const phaseProjects = activeProjects.filter(
                  p => getProjectMacroPhase(p) === phase.id
                )
                return (
                  <div key={phase.id}>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: phase.color }}
                      />
                      <h3 className="font-semibold text-gray-700 text-sm truncate">
                        {phase.name}
                      </h3>
                      <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                        {phaseProjects.length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {phaseProjects.map(p => (
                        <ProjectCard
                          key={p.id}
                          project={p}
                          client={clients.find(c => c.id === p.clientId)}
                          substationType={substationTypes.find(t => t.id === p.substationTypeId)}
                          phaseColor={phase.color}
                        />
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
                  <div>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <div className="w-3 h-3 rounded-full bg-gray-300 shrink-0" />
                      <h3 className="font-semibold text-gray-500 text-sm">Sem Fase</h3>
                      <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {unphased.length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {unphased.map(p => (
                        <ProjectCard
                          key={p.id}
                          project={p}
                          client={clients.find(c => c.id === p.clientId)}
                          substationType={substationTypes.find(t => t.id === p.substationTypeId)}
                          phaseColor="#9ca3af"
                        />
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* ── Lista ── */}
        {view === 'list' && activeProjects.length > 0 && (
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <div className="col-span-1" />
              <div className="col-span-3">Projeto</div>
              <div className="col-span-2">Cliente</div>
              <div className="col-span-2">Fase Atual</div>
              <div className="col-span-2">Etapa Atual</div>
              <div className="col-span-1 text-center">Prazo</div>
              <div className="col-span-1 text-center">Progresso</div>
            </div>

            {[...activeProjects]
              .sort((a, b) => {
                const order = { overdue: 0, warning: 1, ok: 2, none: 3 }
                return order[getProjectAlert(a)] - order[getProjectAlert(b)]
              })
              .map(p => {
                const client       = clients.find(c => c.id === p.clientId)
                const substationType = substationTypes.find(t => t.id === p.substationTypeId)
                const macroPhaseId = getProjectMacroPhase(p)
                const phase        = macroPhases.find(m => m.id === macroPhaseId)
                const activeStages = p.stages
                  .filter(s => s.status !== 'SKIPPED')
                  .sort((a, b) => a.stageNumber - b.stageNumber)
                const firstPending  = activeStages.find(s => s.status !== 'COMPLETED')
                const alert         = getProjectAlert(p)
                const daysLeft      = getDaysLeft(p.plannedEndDate)
                const completedCount = p.stages.filter(s => s.status === 'COMPLETED').length
                const totalActive    = p.stages.filter(s => s.status !== 'SKIPPED').length
                const progress       = totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 0

                return (
                  <div
                    key={p.id}
                    className="grid grid-cols-12 gap-2 px-5 py-3 items-center border-t hover:bg-gray-50 transition-colors"
                  >
                    <div className="col-span-1 flex justify-center">
                      <AlertIndicator level={alert} />
                    </div>
                    <div className="col-span-3 min-w-0">
                      <p className="font-semibold text-gray-800 truncate text-sm">{p.title}</p>
                      <p className="text-xs text-gray-400 truncate">{substationType?.name ?? ''}</p>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{client?.name ?? ''}</p>
                    </div>
                    <div className="col-span-2">
                      {phase ? (
                        <span
                          className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full text-white"
                          style={{ backgroundColor: phase.color }}
                        >
                          {phase.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                    <div className="col-span-2 min-w-0">
                      <p className="text-xs text-gray-600 truncate">
                        {firstPending
                          ? `${firstPending.stageNumber}. ${firstPending.title}`
                          : ''}
                      </p>
                    </div>
                    <div className="col-span-1 text-center">
                      {daysLeft !== null ? (
                        <span className={clsx('text-xs font-semibold',
                          daysLeft < 0 ? 'text-red-500' : daysLeft <= 15 ? 'text-yellow-500' : 'text-green-600'
                        )}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d atr.` : `${daysLeft}d`}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                    <div className="col-span-1">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{progress}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        )}

      </main>
    </div>
  )
}