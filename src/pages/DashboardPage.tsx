import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Badge from '../components/Badge'
import { STATUS_LABELS, type ProjectStatus } from '../types'
import { FolderKanban, Clock, CheckCircle2, AlertCircle, Users, Building2 } from 'lucide-react'
import clsx from 'clsx'

const STATUS_COLOR: Record<ProjectStatus, 'blue' | 'yellow' | 'green' | 'red'> = {
  IN_PROGRESS: 'blue', WAITING: 'yellow', COMPLETED: 'green', CANCELLED: 'red',
}

export default function DashboardPage() {
  const { projects, clients, resellers, substationTypes } = useApp()
  const navigate = useNavigate()

  const total      = projects.length
  const inProgress = projects.filter(p => p.status === 'IN_PROGRESS').length
  const waiting    = projects.filter(p => p.status === 'WAITING').length
  const completed  = projects.filter(p => p.status === 'COMPLETED').length
  const cancelled  = projects.filter(p => p.status === 'CANCELLED').length

  const activeProjects = projects
    .filter(p => p.status === 'IN_PROGRESS' || p.status === 'WAITING')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  // Projetos atrasados
  const overdueCount = projects.filter(p =>
    p.plannedEndDate &&
    p.status !== 'COMPLETED' &&
    p.status !== 'CANCELLED' &&
    new Date(p.plannedEndDate) < new Date()
  ).length

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card icon={<FolderKanban size={20} className="text-brand" />}
          label="Total de Projetos" value={total} bg="bg-blue-50"
          onClick={() => navigate('/projects')} />
        <Card icon={<Clock size={20} className="text-yellow-500" />}
          label="Em Andamento" value={inProgress} bg="bg-yellow-50"
          onClick={() => navigate('/projects')} />
        <Card icon={<AlertCircle size={20} className="text-orange-400" />}
          label="Aguardando" value={waiting} bg="bg-orange-50"
          onClick={() => navigate('/projects')} />
        <Card icon={<CheckCircle2 size={20} className="text-green-500" />}
          label="Concluídos" value={completed} bg="bg-green-50"
          onClick={() => navigate('/projects')} />
      </div>

      {/* Alerta de atrasados */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6 cursor-pointer"
          onClick={() => navigate('/projects')}>
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            <strong>{overdueCount} projeto{overdueCount > 1 ? 's' : ''}</strong> com prazo vencido.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Projetos ativos */}
        <div className="md:col-span-2">
          <h2 className="font-semibold text-gray-700 mb-3">Projetos Ativos</h2>

          {activeProjects.length === 0 && (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <p className="text-sm">Nenhum projeto ativo.</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {activeProjects.map(p => {
              const client         = clients.find(c => c.id === p.clientId)
              const substationType = substationTypes.find(t => t.id === p.substationTypeId)
              const completedCount = p.stages.filter(s => s.status === 'COMPLETED').length
              const totalActive    = p.stages.filter(s => s.status !== 'SKIPPED').length
              const progress       = totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 0
              const currentStage   = p.stages.find(s => s.stageNumber === p.currentStage)

              const daysLeft = p.plannedEndDate
                ? Math.ceil((new Date(p.plannedEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null

              return (
                <div key={p.id}
                  className="bg-white rounded-xl border p-4 cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => navigate(`/projects/${p.id}`)}>

                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{p.title}</p>
                      <p className="text-xs text-gray-400 truncate">{substationType?.name ?? '—'}</p>
                      <p className="text-xs text-gray-300 mt-0.5">{client?.name ?? '—'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                      <Badge color={STATUS_COLOR[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                      {daysLeft !== null && (
                        <span className={clsx(
                          'text-xs font-medium',
                          daysLeft < 0 ? 'text-red-500' :
                          daysLeft <= 15 ? 'text-yellow-500' :
                          'text-gray-400'
                        )}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d atrasado` : `${daysLeft}d restantes`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span className="truncate mr-2">
                        Etapa {p.currentStage}: {currentStage?.title ?? '—'}
                      </span>
                      <span className="shrink-0">{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand rounded-full transition-all"
                        style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <p className="text-xs text-gray-300 mt-2">
                    Atualizado em {formatDate(p.updatedAt)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Painel lateral */}
        <div className="flex flex-col gap-4">
          {/* Resumo */}
          <div className="bg-white rounded-xl border p-4">
            <h2 className="font-semibold text-gray-700 mb-3">Resumo</h2>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Em Andamento</span>
                <span className="font-semibold text-blue-600">{inProgress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Aguardando</span>
                <span className="font-semibold text-yellow-500">{waiting}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Concluídos</span>
                <span className="font-semibold text-green-500">{completed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cancelados</span>
                <span className="font-semibold text-red-400">{cancelled}</span>
              </div>
              {overdueCount > 0 && (
                <div className="flex justify-between pt-1 border-t">
                  <span className="text-red-500">Atrasados</span>
                  <span className="font-semibold text-red-500">{overdueCount}</span>
                </div>
              )}
              <hr className="my-1" />
              <div className="flex justify-between">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-gray-700">{total}</span>
              </div>
            </div>
          </div>

          {/* Cadastros */}
          <div className="bg-white rounded-xl border p-4">
            <h2 className="font-semibold text-gray-700 mb-3">Cadastros</h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors"
                onClick={() => navigate('/clients')}>
                <div className="bg-blue-50 p-2 rounded-lg">
                  <Users size={16} className="text-brand" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Clientes</p>
                  <p className="text-xs text-gray-400">
                    {clients.length} cadastrado{clients.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors"
                onClick={() => navigate('/resellers')}>
                <div className="bg-blue-50 p-2 rounded-lg">
                  <Building2 size={16} className="text-brand" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Revendedores</p>
                  <p className="text-xs text-gray-400">
                    {resellers.length} cadastrado{resellers.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors"
                onClick={() => navigate('/settings')}>
                <div className="bg-blue-50 p-2 rounded-lg">
                  <FolderKanban size={16} className="text-brand" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Tipos de Subestação</p>
                  <p className="text-xs text-gray-400">
                    {substationTypes.length} cadastrado{substationTypes.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Card ───────────────────────────────────────────────────────────────────
function Card({ icon, label, value, bg, onClick }: {
  icon: React.ReactNode
  label: string
  value: number
  bg: string
  onClick: () => void
}) {
  return (
    <div onClick={onClick}
      className={clsx('rounded-xl border p-4 cursor-pointer hover:shadow-sm transition-shadow flex items-center gap-3', bg)}>
      <div className="bg-white p-2 rounded-lg shadow-sm">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}