import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Badge from '../components/Badge'
import { STATUS_LABELS, type ProjectStatus } from '../types'
import {
  AlertCircle, ArrowUpRight, Building2, CheckCircle2,
  Clock, FolderKanban, Gauge, Users, Zap
} from 'lucide-react'
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
    .slice(0, 6)

  const overdueCount = projects.filter(p =>
    p.plannedEndDate &&
    p.status !== 'COMPLETED' &&
    p.status !== 'CANCELLED' &&
    new Date(p.plannedEndDate) < new Date()
  ).length

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-white shadow-lg">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.9fr] lg:p-7">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-100">
              <Zap size={13} />
              Projetos elétricos em acompanhamento
            </div>
            <h1 className="max-w-3xl text-3xl font-bold tracking-tight">
              Visão executiva da carteira de subestações
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Prazos, etapas e partes envolvidas reunidos em uma visão operacional para tomada de decisão.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="app-button-primary bg-teal-500 hover:bg-teal-400" onClick={() => navigate('/projects/new')}>
                Novo Projeto
                <ArrowUpRight size={16} />
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10" onClick={() => navigate('/portal')}>
                Visão por fase
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <HeroStat label="Ativos" value={inProgress + waiting} />
            <HeroStat label="Atrasados" value={overdueCount} tone={overdueCount > 0 ? 'danger' : 'ok'} />
            <HeroStat label="Conclusão" value={`${completionRate}%`} />
            <HeroStat label="Cadastros" value={clients.length + resellers.length} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={<FolderKanban size={19} />} label="Total de Projetos" value={total} tone="blue" onClick={() => navigate('/projects')} />
        <MetricCard icon={<Clock size={19} />} label="Em Andamento" value={inProgress} tone="yellow" onClick={() => navigate('/projects')} />
        <MetricCard icon={<AlertCircle size={19} />} label="Aguardando" value={waiting} tone="orange" onClick={() => navigate('/projects')} />
        <MetricCard icon={<CheckCircle2 size={19} />} label="Concluídos" value={completed} tone="green" onClick={() => navigate('/projects')} />
      </section>

      {overdueCount > 0 && (
        <button
          className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700 shadow-sm"
          onClick={() => navigate('/projects')}>
          <AlertCircle size={18} className="shrink-0" />
          <span><strong>{overdueCount} projeto{overdueCount > 1 ? 's' : ''}</strong> com prazo vencido.</span>
        </button>
      )}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="app-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Projetos ativos</h2>
              <p className="text-sm text-slate-500">Últimas movimentações da carteira</p>
            </div>
            <button className="text-sm font-semibold text-brand hover:text-brand-hover" onClick={() => navigate('/projects')}>
              Ver todos
            </button>
          </div>

          {activeProjects.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">Nenhum projeto ativo.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeProjects.map(p => {
                const client         = clients.find(c => c.id === p.clientId)
                const substationType = substationTypes.find(t => t.id === p.substationTypeId)
                const completedCount = p.stages.filter(s => s.status === 'COMPLETED').length
                const totalActive    = p.stages.filter(s => s.status !== 'SKIPPED').length
                const progress       = totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 0
                const currentStage   = p.stages.find(s => s.stageNumber === p.currentStage)
                const daysLeft = p.plannedEndDate
                  ? Math.ceil((new Date(p.plannedEndDate).getTime() - Date.now()) / 86400000)
                  : null

                return (
                  <button key={p.id}
                    className="grid w-full grid-cols-[1fr_auto] gap-4 px-5 py-4 text-left hover:bg-slate-50"
                    onClick={() => navigate(`/projects/${p.id}`)}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-slate-900">{p.title}</p>
                        <Badge color={STATUS_COLOR[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {substationType?.name ?? 'Sem tipo'} · {client?.name ?? 'Sem cliente'}
                      </p>
                      <p className="mt-2 truncate text-xs text-slate-500">
                        Etapa {p.currentStage}: {currentStage?.title ?? 'Não definida'}
                      </p>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    <div className="flex min-w-[92px] flex-col items-end justify-between">
                      <span className="text-sm font-bold text-slate-900">{progress}%</span>
                      {daysLeft !== null && (
                        <span className={clsx(
                          'text-xs font-semibold',
                          daysLeft < 0 ? 'text-red-600' :
                          daysLeft <= 15 ? 'text-amber-600' :
                          'text-slate-500'
                        )}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d atraso` : `${daysLeft}d`}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="app-panel p-5">
            <div className="mb-4 flex items-center gap-2">
              <Gauge size={18} className="text-brand" />
              <h2 className="font-bold text-slate-900">Resumo</h2>
            </div>
            <div className="space-y-3 text-sm">
              <SummaryRow label="Em Andamento" value={inProgress} tone="text-blue-700" />
              <SummaryRow label="Aguardando" value={waiting} tone="text-amber-700" />
              <SummaryRow label="Concluídos" value={completed} tone="text-emerald-700" />
              <SummaryRow label="Cancelados" value={cancelled} tone="text-red-600" />
              <div className="border-t border-slate-100 pt-3">
                <SummaryRow label="Total" value={total} tone="text-slate-900" strong />
              </div>
            </div>
          </div>

          <div className="app-panel p-5">
            <h2 className="mb-4 font-bold text-slate-900">Cadastros</h2>
            <QuickLink icon={<Users size={17} />} label="Clientes" value={clients.length} onClick={() => navigate('/clients')} />
            <QuickLink icon={<Building2 size={17} />} label="Revendedores" value={resellers.length} onClick={() => navigate('/resellers')} />
            <QuickLink icon={<FolderKanban size={17} />} label="Tipos de Subestação" value={substationTypes.length} onClick={() => navigate('/settings')} />
          </div>
        </aside>
      </section>
    </div>
  )
}

function HeroStat({ label, value, tone }: { label: string; value: string | number; tone?: 'danger' | 'ok' }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={clsx(
        'mt-2 text-2xl font-bold',
        tone === 'danger' ? 'text-red-200' : tone === 'ok' ? 'text-emerald-200' : 'text-white'
      )}>{value}</p>
    </div>
  )
}

function MetricCard({ icon, label, value, tone, onClick }: {
  icon: React.ReactNode
  label: string
  value: number
  tone: 'blue' | 'yellow' | 'orange' | 'green'
  onClick: () => void
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    yellow: 'bg-amber-50 text-amber-700',
    orange: 'bg-orange-50 text-orange-700',
    green: 'bg-emerald-50 text-emerald-700',
  }
  return (
    <button onClick={onClick} className="app-card flex items-center gap-4 p-4 text-left hover:-translate-y-0.5 hover:shadow-md">
      <div className={clsx('flex h-10 w-10 items-center justify-center rounded-lg', tones[tone])}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      </div>
    </button>
  )
}

function SummaryRow({ label, value, tone, strong }: { label: string; value: number; tone: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={clsx(strong ? 'text-base font-bold' : 'font-bold', tone)}>{value}</span>
    </div>
  )
}

function QuickLink({ icon, label, value, onClick }: {
  icon: React.ReactNode
  label: string
  value: number
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-slate-50">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-brand">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-400">{value} cadastrado{value !== 1 ? 's' : ''}</p>
      </div>
      <ArrowUpRight size={15} className="text-slate-300" />
    </button>
  )
}
