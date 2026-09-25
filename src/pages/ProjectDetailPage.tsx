import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Pencil, Trash2, CheckCircle2, Clock,
  AlertCircle, Minus, FileText, History, LayoutList,
  ChevronDown, ChevronUp, Calendar, Save, MessageCircle
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Modal from '../components/Modal'
import DocumentsTab from '../components/DocumentsTab'
import {
  STATUS_LABELS, STAGE_STATUS_LABELS,
  type ProjectStatus, type StageStatus,
  type Stage,
} from '../types'
import clsx from 'clsx'

// ── Constantes ─────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<ProjectStatus, 'blue' | 'yellow' | 'green' | 'red'> = {
  IN_PROGRESS: 'blue', WAITING: 'yellow', COMPLETED: 'green', CANCELLED: 'red',
}

const STAGE_STATUS_OPTIONS: { value: StageStatus; label: string }[] = [
  { value: 'PENDING',          label: 'Pendente' },
  { value: 'IN_PROGRESS',      label: 'Em Andamento' },
  { value: 'WAITING_APPROVAL', label: 'Aguardando Aprovação' },
  { value: 'COMPLETED',        label: 'Concluída' },
  { value: 'SKIPPED',          label: 'N/A' },
]

const STAGE_COLOR: Record<StageStatus, string> = {
  COMPLETED: 'bg-green-500', IN_PROGRESS: 'bg-blue-500',
  WAITING_APPROVAL: 'bg-yellow-400', PENDING: 'bg-gray-200', SKIPPED: 'bg-gray-100',
}

const STAGE_BADGE: Record<StageStatus, 'green' | 'blue' | 'yellow' | 'gray'> = {
  COMPLETED: 'green', IN_PROGRESS: 'blue', WAITING_APPROVAL: 'yellow',
  PENDING: 'gray', SKIPPED: 'gray',
}

type Tab = 'overview' | 'stages' | 'documents' | 'history'

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatDateTime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function toInputDate(iso?: string) {
  if (!iso) return ''
  return iso.split('T')[0]
}

// ── Componente principal ───────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    projects, clients, resellers, substationTypes, requestTypes,
    updateProjectStage, updateProjectStatus,
    updateProject, deleteProject, advanceStage,
  } = useApp()

  const [activeTab, setActiveTab]         = useState<Tab>('overview')
  const [expandedStage, setExpandedStage] = useState<string | null>(null)
  const [stageDrafts, setStageDrafts]     = useState<Record<string, Partial<Stage>>>({})
  const [savingStageId, setSavingStageId] = useState<string | null>(null)
  const [advancingStage, setAdvancingStage] = useState(false)
  const [stageNotice, setStageNotice]     = useState<{ tone: 'success' | 'warning' | 'error'; message: string } | null>(null)
  const [editOpen, setEditOpen]           = useState(false)
  const [editForm, setEditForm]           = useState({
    title: '', substationTypeId: '', transformerKva: '',
    concessionaria: '', startDate: '', plannedEndDate: '',
  })

  const project = projects.find(p => p.id === id)

  if (!project) {
    return (
      <div className="text-center py-24 text-gray-400">
        <p className="font-medium text-gray-600">Projeto não encontrado.</p>
        <button
          onClick={() => navigate('/projects')}
          className="text-brand text-sm mt-2 underline"
        >
          Voltar para projetos
        </button>
      </div>
    )
  }

  // A partir daqui project é definitivamente definido
  const client         = clients.find(c => c.id === project.clientId)
  const reseller       = resellers.find(r => r.id === project.resellerId)
  const substationType = substationTypes.find(t => t.id === project.substationTypeId)
  const completedCount = project.stages.filter(s => s.status === 'COMPLETED').length
  const totalActive    = project.stages.filter(s => s.status !== 'SKIPPED').length
  const progress       = totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 0
  const currentStageObj = project.stages.find(s => s.stageNumber === project.currentStage)

  const daysLeft = project.plannedEndDate
    ? Math.ceil((new Date(project.plannedEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  function shareStageOnWhatsApp(stage: Stage) {
    const lines = [
      '*Atualização de projeto*',
      '',
      `*Projeto:* ${project!.title}`,
      `*Cliente:* ${client?.name ?? 'Não informado'}`,
      `*Revendedor:* ${reseller?.name ?? 'Não informado'}`,
      `*Etapa ${stage.stageNumber}:* ${stage.title}`,
      `*Status:* ${STAGE_STATUS_LABELS[stage.status]}`,
      `*Data de início:* ${formatDate(stage.plannedStartDate)}`,
      `*Término previsto:* ${formatDate(stage.plannedEndDate)}`,
      `*Conclusão real:* ${formatDate(stage.completedAt)}`,
    ]
    if (stage.protocol?.trim()) lines.push(`*Protocolo:* ${stage.protocol.trim()}`)
    if (stage.notes?.trim()) lines.push('', '*Comentário da atividade:*', stage.notes.trim())
    lines.push('', `*Acompanhar projeto:* ${window.location.origin}/portal/${project!.resellerId}`)

    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener,noreferrer')
  }

  function openEdit() {
    setEditForm({
      title:            project!.title,
      substationTypeId: project!.substationTypeId,
      transformerKva:   project!.transformerKva?.toString() ?? '',
      concessionaria:   project!.concessionaria,
      startDate:        toInputDate(project!.startDate),
      plannedEndDate:   toInputDate(project!.plannedEndDate),
    })
    setEditOpen(true)
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateProject(project!.id, {
      title:            editForm.title,
      substationTypeId: editForm.substationTypeId || undefined,
      transformerKva:   editForm.transformerKva ? parseFloat(editForm.transformerKva) : undefined,
      concessionaria:   editForm.concessionaria,
      startDate:        editForm.startDate        ? new Date(editForm.startDate).toISOString()        : undefined,
      plannedEndDate:   editForm.plannedEndDate   ? new Date(editForm.plannedEndDate).toISOString()   : undefined,
    })
    setEditOpen(false)
  }

  function handleDelete() {
    if (confirm(`Excluir projeto "${project!.title}"?`)) {
      deleteProject(project!.id)
      navigate('/projects')
    }
  }

  function changeStageDraft(stage: Stage, data: Partial<Stage>) {
    setStageDrafts(previous => ({
      ...previous,
      [stage.id]: {
        status: stage.status,
        protocol: stage.protocol,
        plannedStartDate: stage.plannedStartDate,
        plannedEndDate: stage.plannedEndDate,
        notes: stage.notes,
        ...previous[stage.id],
        ...data,
      },
    }))
  }

  async function saveStage(stage: Stage) {
    const draft = stageDrafts[stage.id]
    if (!draft) return
    setSavingStageId(stage.id)
    setStageNotice(null)
    try {
      const notification = await updateProjectStage(project!.id, stage.id, draft)
      setStageDrafts(previous => {
        const next = { ...previous }
        delete next[stage.id]
        return next
      })
      setStageNotice({
        tone: notification.status === 'sent' ? 'success' : notification.status === 'skipped' ? 'warning' : 'error',
        message: notification.message,
      })
    } catch (error) {
      setStageNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Não foi possível salvar a etapa.' })
    } finally {
      setSavingStageId(null)
    }
  }

  async function handleAdvanceStage() {
    setAdvancingStage(true)
    setStageNotice(null)
    try {
      const notification = await advanceStage(project!.id)
      setStageNotice({
        tone: notification.status === 'sent' ? 'success' : notification.status === 'skipped' ? 'warning' : 'error',
        message: notification.message,
      })
    } catch (error) {
      setStageNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Não foi possível avançar a etapa.' })
    } finally {
      setAdvancingStage(false)
    }
  }

  const inp = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40'
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="mx-auto max-w-7xl">

      {/* ── Cabeçalho ──────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 mb-6">
        <button
          onClick={() => navigate('/projects')}
          className="mt-1 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
            <Badge color={STATUS_COLOR[project.status]}>{STATUS_LABELS[project.status]}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {substationType?.name ?? '—'}
            {project.transformerKva ? ` · ${project.transformerKva} kVA` : ''}
            {' · '}{project.concessionaria}
            {' · '}Criado em {formatDate(project.createdAt)}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="ghost" onClick={openEdit}>
            <Pencil size={14} /> Editar
          </Button>
          <Button size="sm" variant="danger" onClick={handleDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* ── Cards de datas macro ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MacroCard label="Início" value={formatDate(project.startDate)} icon={<Calendar size={15} />} />
        <MacroCard
          label="Prazo de Entrega"
          value={formatDate(project.plannedEndDate)}
          icon={<Calendar size={15} />}
          highlight={daysLeft !== null && daysLeft < 0 ? 'red' : daysLeft !== null && daysLeft <= 15 ? 'yellow' : undefined}
        />
        <MacroCard
          label="Dias Restantes"
          value={daysLeft === null ? '—' : daysLeft < 0 ? `${Math.abs(daysLeft)}d atrasado` : `${daysLeft}d`}
          icon={<Clock size={15} />}
          highlight={daysLeft !== null && daysLeft < 0 ? 'red' : daysLeft !== null && daysLeft <= 15 ? 'yellow' : undefined}
        />
        <MacroCard
          label="Conclusão Real"
          value={formatDate(project.actualEndDate)}
          icon={<CheckCircle2 size={15} />}
          highlight={project.actualEndDate ? 'green' : undefined}
        />
      </div>

      {/* ── Pipeline ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
              Progresso do Processo
            </span>
            <p className="text-sm text-gray-600 mt-0.5">
              Etapa atual:{' '}
              <span className="font-semibold text-gray-800">
                {project.currentStage} — {currentStageObj?.title ?? '—'}
              </span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-brand">{progress}%</span>
            <p className="text-xs text-gray-400">{completedCount}/{totalActive} concluídas</p>
          </div>
        </div>

        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-brand rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {project.stages.map(stage => (
            <div
              key={stage.id}
              title={stage.title}
              className={clsx(
                'flex-1 min-w-[48px] rounded-lg p-2 text-center cursor-pointer transition-all border-2',
                stage.stageNumber === project.currentStage
                  ? 'border-brand bg-blue-50'
                  : 'border-transparent bg-gray-50 hover:bg-gray-100',
                stage.status === 'SKIPPED' && 'opacity-30'
              )}
              onClick={() => { setActiveTab('stages'); setExpandedStage(stage.id) }}
            >
              <div className={clsx('w-2 h-2 rounded-full mx-auto mb-1', STAGE_COLOR[stage.status])} />
              <p className="text-xs font-semibold text-gray-600">{stage.stageNumber}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-4 mt-3 flex-wrap">
          {[
            { color: 'bg-green-500',  label: 'Concluída' },
            { color: 'bg-blue-500',   label: 'Em Andamento' },
            { color: 'bg-yellow-400', label: 'Aguardando' },
            { color: 'bg-gray-200',   label: 'Pendente' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={clsx('w-2 h-2 rounded-full', l.color)} />
              <span className="text-xs text-gray-400">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Abas ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="flex border-b">
          {([
            { key: 'overview',  label: 'Visão Geral',  icon: <LayoutList size={15} /> },
            { key: 'stages',    label: 'Etapas',       icon: <CheckCircle2 size={15} /> },
            { key: 'documents', label: 'Documentos',   icon: <FileText size={15} /> },
            { key: 'history',   label: 'Histórico',    icon: <History size={15} /> },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-brand text-brand bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* ── Visão Geral ─────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              <div>
                <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">
                  Dados Técnicos
                </h3>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-50">
                    <InfoRow label="Tipo de Subestação" value={substationType?.name ?? '—'} />
                    <InfoRow label="Potência" value={project.transformerKva ? `${project.transformerKva} kVA` : '—'} />
                    <InfoRow label="Concessionária" value={project.concessionaria} />
                    <InfoRow label="Etapa Atual" value={`${project.currentStage} — ${currentStageObj?.title ?? '—'}`} />
                    <InfoRow label="Status" value={STATUS_LABELS[project.status]} />
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">
                  Partes Envolvidas
                </h3>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-50">
                    <InfoRow label="Cliente Final" value={client?.name ?? '—'} />
                    <InfoRow label="CPF / CNPJ" value={client?.cpfCnpj ?? '—'} />
                    <InfoRow label="E-mail" value={client?.email ?? '—'} />
                    <InfoRow label="Telefone" value={client?.phone ?? '—'} />
                    <InfoRow label="Cidade / UF" value={client?.city ? `${client.city}/${client.state}` : '—'} />
                    <InfoRow label="Revendedor" value={reseller?.name ?? '—'} />
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">
                  Cronograma
                </h3>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-50">
                    <InfoRow label="Data de Início" value={formatDate(project.startDate)} />
                    <InfoRow label="Prazo de Entrega" value={formatDate(project.plannedEndDate)} />
                    <InfoRow label="Conclusão Real" value={formatDate(project.actualEndDate)} />
                    <InfoRow label="Última Atualização" value={formatDateTime(project.updatedAt)} />
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">
                  Status do Projeto
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {(['IN_PROGRESS', 'WAITING', 'COMPLETED', 'CANCELLED'] as ProjectStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => updateProjectStatus(project.id, s)}
                      className={clsx(
                        'px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-left',
                        project.status === s
                          ? 'bg-brand text-white border-brand'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Etapas ──────────────────────────────────────────────────── */}
        {activeTab === 'stages' && (
          <div>
            <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                {project.stages.length} etapas · {completedCount} concluídas
              </p>
              <Button size="sm" variant="ghost" onClick={handleAdvanceStage} disabled={advancingStage}>
                {advancingStage ? 'Avançando...' : 'Avançar etapa →'}
              </Button>
            </div>

            {stageNotice && (
              <div className={clsx(
                'mx-6 mt-4 border px-4 py-3 text-sm',
                stageNotice.tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
                stageNotice.tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-800',
                stageNotice.tone === 'error' && 'border-red-200 bg-red-50 text-red-700',
              )} role="status">
                {stageNotice.message}
              </div>
            )}

            <div className="divide-y">
              {project.stages.map(stage => {
                const isExpanded = expandedStage === stage.id
                const isCurrent  = stage.stageNumber === project.currentStage
                const isSkipped  = stage.status === 'SKIPPED'
                const draft = stageDrafts[stage.id] ?? {
                  status: stage.status,
                  protocol: stage.protocol,
                  plannedStartDate: stage.plannedStartDate,
                  plannedEndDate: stage.plannedEndDate,
                  notes: stage.notes,
                }

                return (
                  <div key={stage.id} className={clsx(isSkipped && 'opacity-40')}>
                    <div
                      className={clsx(
                        'flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors',
                        isCurrent && 'bg-blue-50/60'
                      )}
                      onClick={() => !isSkipped && setExpandedStage(isExpanded ? null : stage.id)}
                    >
                      <div className={clsx(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                        stage.status === 'COMPLETED'        ? 'bg-green-100 text-green-700' :
                        stage.status === 'IN_PROGRESS'      ? 'bg-blue-100 text-blue-700' :
                        stage.status === 'WAITING_APPROVAL' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      )}>
                        {stage.status === 'COMPLETED'        ? <CheckCircle2 size={16} /> :
                         stage.status === 'IN_PROGRESS'      ? <Clock size={16} /> :
                         stage.status === 'WAITING_APPROVAL' ? <AlertCircle size={16} /> :
                         stage.status === 'SKIPPED'          ? <Minus size={16} /> :
                         stage.stageNumber}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isCurrent && (
                            <span className="text-xs bg-brand text-white px-1.5 py-0.5 rounded font-medium shrink-0">
                              ATUAL
                            </span>
                          )}
                          <p className={clsx(
                            'text-sm font-medium',
                            isSkipped ? 'line-through text-gray-300' : 'text-gray-800'
                          )}>
                            {stage.title}
                          </p>
                        </div>
                        {(stage.plannedStartDate || stage.plannedEndDate) && !isExpanded && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {stage.plannedStartDate && `Prev. início: ${formatDate(stage.plannedStartDate)}`}
                            {stage.plannedStartDate && stage.plannedEndDate && ' · '}
                            {stage.plannedEndDate && `Prev. fim: ${formatDate(stage.plannedEndDate)}`}
                          </p>
                        )}
                        {stage.notes && !isExpanded && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{stage.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {stage.completedAt && (
                          <p className="text-xs text-gray-400 hidden md:block">
                            {formatDate(stage.completedAt)}
                          </p>
                        )}
                        <Badge color={STAGE_BADGE[stage.status]}>
                          {STAGE_STATUS_LABELS[stage.status]}
                        </Badge>
                        {!isSkipped && (
                          isExpanded
                            ? <ChevronUp size={15} className="text-gray-400" />
                            : <ChevronDown size={15} className="text-gray-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && !isSkipped && (
                      <div className="px-6 pb-5 pt-4 bg-gray-50 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                            Status
                          </label>
                          <select
                            value={draft.status}
                            onChange={e => changeStageDraft(stage, { status: e.target.value as StageStatus })}
                            className="border rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-brand/40"
                          >
                            {STAGE_STATUS_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                            Protocolo / Referência
                          </label>
                          <input
                            value={draft.protocol ?? ''}
                            onChange={e => changeStageDraft(stage, { protocol: e.target.value })}
                            placeholder="Nº do protocolo, referência..."
                            className="border rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-brand/40"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                            Data Prevista de Início
                          </label>
                          <input
                            type="date"
                            value={toInputDate(draft.plannedStartDate)}
                            onChange={e => changeStageDraft(stage, {
                              plannedStartDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                            })}
                            className="border rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-brand/40"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                            Data Prevista de Fim
                          </label>
                          <input
                            type="date"
                            value={toInputDate(draft.plannedEndDate)}
                            onChange={e => changeStageDraft(stage, {
                              plannedEndDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                            })}
                            className="border rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-brand/40"
                          />
                        </div>

                        {stage.actualStartDate && (
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                              Início Real
                            </label>
                            <p className="text-sm text-gray-700 py-2">{formatDate(stage.actualStartDate)}</p>
                          </div>
                        )}

                        {stage.completedAt && (
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                              Conclusão Real
                            </label>
                            <p className="text-sm text-gray-700 py-2">{formatDate(stage.completedAt)}</p>
                          </div>
                        )}

                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                            Observações Técnicas
                          </label>
                          <textarea
                            value={draft.notes ?? ''}
                            onChange={e => changeStageDraft(stage, { notes: e.target.value })}
                            rows={3}
                            placeholder="Registre informações técnicas, pendências, contatos realizados..."
                            className="border rounded-lg px-3 py-2 text-sm w-full resize-none bg-white focus:outline-none focus:ring-2 focus:ring-brand/40"
                          />
                        </div>

                        <div className="md:col-span-2 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs text-gray-500">O salvamento envia uma única notificação com todas as alterações realizadas.</p>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-emerald-700"
                              onClick={() => shareStageOnWhatsApp(stage)}
                              disabled={Boolean(stageDrafts[stage.id])}
                              title={stageDrafts[stage.id] ? 'Salve as alterações antes de compartilhar' : 'Escolher uma conversa ou grupo no WhatsApp'}
                            >
                              <MessageCircle size={14} /> Compartilhar no WhatsApp
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => saveStage(stage)}
                              disabled={!stageDrafts[stage.id] || savingStageId === stage.id}
                            >
                              <Save size={14} /> {savingStageId === stage.id ? 'Salvando...' : 'Salvar alterações'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Documentos ──────────────────────────────────────────────── */}
        {activeTab === 'documents' && (
          <DocumentsTab project={project} client={client} substationType={substationType} requestTypes={requestTypes} />
        )}

        {/* ── Histórico ───────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="p-6">
            <div className="flex flex-col gap-3">
              <HistoryItem
                date={formatDateTime(project.createdAt)}
                text={`Projeto criado — ${substationType?.name ?? '—'}`}
                type="create"
              />
              <HistoryItem
                date={formatDateTime(project.updatedAt)}
                text={`Última atualização — Status: ${STATUS_LABELS[project.status]}`}
                type="update"
              />
              {project.stages.filter(s => s.completedAt).map(s => (
                <HistoryItem
                  key={s.id}
                  date={formatDateTime(s.completedAt)}
                  text={`Etapa ${s.stageNumber} concluída — ${s.title}`}
                  type="stage"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal edição ────────────────────────────────────────────────── */}
      {editOpen && (
        <Modal title="Editar Projeto" onClose={() => setEditOpen(false)}>
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-3">
            <div>
              <label className={lbl}>Título *</label>
              <input
                className={inp}
                value={editForm.title}
                onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <label className={lbl}>Tipo de Subestação</label>
              <select
                className={inp}
                value={editForm.substationTypeId}
                onChange={e => setEditForm(p => ({ ...p, substationTypeId: e.target.value }))}
              >
                <option value="">Manter atual</option>
                {substationTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Potência (kVA)</label>
              <input
                className={inp}
                type="number"
                value={editForm.transformerKva}
                onChange={e => setEditForm(p => ({ ...p, transformerKva: e.target.value }))}
              />
            </div>
            <div>
              <label className={lbl}>Concessionária</label>
              <input
                className={inp}
                value={editForm.concessionaria}
                onChange={e => setEditForm(p => ({ ...p, concessionaria: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Data de Início</label>
                <input
                  className={inp}
                  type="date"
                  value={editForm.startDate}
                  onChange={e => setEditForm(p => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className={lbl}>Prazo de Entrega</label>
                <input
                  className={inp}
                  type="date"
                  value={editForm.plannedEndDate}
                  onChange={e => setEditForm(p => ({ ...p, plannedEndDate: e.target.value }))}
                />
              </div>
            </div>
            <p className="text-xs text-orange-400">
              ⚠️ Alterar o tipo irá regenerar as etapas do projeto.
            </p>
            <div className="flex gap-2 pt-1">
              <Button type="submit">Salvar</Button>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────────────────
function MacroCard({ label, value, icon, highlight }: {
  label: string
  value: string
  icon: React.ReactNode
  highlight?: 'red' | 'yellow' | 'green'
}) {
  return (
    <div className={clsx(
      'rounded-xl border p-4',
      highlight === 'red'    ? 'bg-red-50 border-red-200' :
      highlight === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
      highlight === 'green'  ? 'bg-green-50 border-green-200' :
      'bg-white'
    )}>
      <div className={clsx(
        'flex items-center gap-1.5 text-xs font-medium mb-1',
        highlight === 'red'    ? 'text-red-500' :
        highlight === 'yellow' ? 'text-yellow-600' :
        highlight === 'green'  ? 'text-green-600' :
        'text-gray-400'
      )}>
        {icon}{label}
      </div>
      <p className={clsx(
        'font-semibold text-sm',
        highlight === 'red'    ? 'text-red-700' :
        highlight === 'yellow' ? 'text-yellow-700' :
        highlight === 'green'  ? 'text-green-700' :
        'text-gray-800'
      )}>
        {value}
      </p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-2 pr-4 text-gray-400 font-medium whitespace-nowrap w-40">{label}</td>
      <td className="py-2 text-gray-800">{value}</td>
    </tr>
  )
}

function HistoryItem({ date, text, type }: {
  date: string
  text: string
  type: 'create' | 'update' | 'stage'
}) {
  const dots = { create: 'bg-green-400', update: 'bg-blue-400', stage: 'bg-gray-300' }
  return (
    <div className="flex items-start gap-3">
      <div className={clsx('w-2 h-2 rounded-full mt-1.5 shrink-0', dots[type])} />
      <div className="flex-1">
        <p className="text-sm text-gray-700">{text}</p>
        <p className="text-xs text-gray-400 mt-0.5">{date}</p>
      </div>
    </div>
  )
}
