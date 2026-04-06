import { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Button from '../components/Button'
import Modal from '../components/Modal'
import type { DefaultStageTemplate, StageTemplate, SubstationTypeConfig, MacroPhase } from '../types'
import clsx from 'clsx'

const EMPTY_STAGE = { order: 1, title: '', description: '', defaultDurationDays: 7, macroPhaseId: '' }

const COLOR_OPTIONS = [
  { label: 'Azul',    value: '3b82f6' },
  { label: 'Amarelo', value: 'f59e0b' },
  { label: 'Roxo',    value: '8b5cf6' },
  { label: 'Laranja', value: 'f97316' },
  { label: 'Rosa',    value: 'ec4899' },
  { label: 'Verde',   value: '10b981' },
  { label: 'Vermelho',value: 'ef4444' },
  { label: 'Cinza',   value: '6b7280' },
  { label: 'Ciano',   value: '06b6d4' },
  { label: 'Índigo',  value: '6366f1' },
]

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SettingsPage() {
  const {
    macroPhases, addMacroPhase, updateMacroPhase, deleteMacroPhase,
    defaultStageModel, addDefaultStage, updateDefaultStage, deleteDefaultStage,
    substationTypes, addSubstationType, updateSubstationType, deleteSubstationType,
    addStageToType, updateStageInType, deleteStageFromType,
    requestTypes, addRequestType, updateRequestType, deleteRequestType,
  } = useApp()

  const [activeTab, setActiveTab] = useState<'macrophases' | 'model' | 'types' | 'requesttypes'>('macrophases')

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'macrophases',  label: 'Fases Macro' },
    { key: 'model',        label: 'Modelo Padrão de Atividades' },
    { key: 'types',        label: 'Tipos de Subestação' },
    { key: 'requesttypes', label: 'Tipos de Solicitação' },
  ]

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Parâmetros</h1>
        <p className="text-sm text-gray-400 mt-1">
          Configure as fases macro, o modelo padrão de atividades, os tipos de subestação e os tipos de solicitação.
        </p>
      </div>

      {/* Abas */}
      <div className="flex border-b mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.key
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'macrophases' && (
        <MacroPhasesTab
          macroPhases={macroPhases}
          onAdd={addMacroPhase}
          onUpdate={updateMacroPhase}
          onDelete={deleteMacroPhase}
        />
      )}
      {activeTab === 'model' && (
        <ModelTab
          stages={defaultStageModel}
          macroPhases={macroPhases}
          onAdd={addDefaultStage}
          onUpdate={updateDefaultStage}
          onDelete={deleteDefaultStage}
        />
      )}
      {activeTab === 'types' && (
        <TypesTab
          substationTypes={substationTypes}
          macroPhases={macroPhases}
          defaultStageModel={defaultStageModel}
          onAddType={addSubstationType}
          onUpdateType={updateSubstationType}
          onDeleteType={deleteSubstationType}
          onAddStage={addStageToType}
          onUpdateStage={updateStageInType}
          onDeleteStage={deleteStageFromType}
        />
      )}
      {activeTab === 'requesttypes' && (
        <RequestTypesTab
          requestTypes={requestTypes}
          onAdd={addRequestType}
          onUpdate={updateRequestType}
          onDelete={deleteRequestType}
        />
      )}
    </div>
  )
}

// ─── Aba Fases Macro ──────────────────────────────────────────────────────────
function MacroPhasesTab({
  macroPhases, onAdd, onUpdate, onDelete
}: {
  macroPhases: MacroPhase[]
  onAdd: (data: Omit<MacroPhase, 'id'>) => void
  onUpdate: (id: string, data: Partial<Omit<MacroPhase, 'id'>>) => void
  onDelete: (id: string) => void
}) {
  const [modal, setModal] = useState<MacroPhase | 'new' | null>(null)
  const [form, setForm] = useState({ name: '', color: '3b82f6', order: 1 })

  function openNew() {
    const nextOrder = Math.max(...macroPhases.map(m => m.order), 0) + 1
    setForm({ name: '', color: '3b82f6', order: nextOrder })
    setModal('new')
  }
  function openEdit(m: MacroPhase) {
    setForm({ name: m.name, color: m.color, order: m.order })
    setModal(m)
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { alert('Informe o nome.'); return }
    if (modal === 'new') onAdd(form)
    else if (modal) onUpdate((modal as MacroPhase).id, form)
    setModal(null)
  }

  const sorted = [...macroPhases].sort((a, b) => a.order - b.order)
  const inp = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40'
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div>
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
        <AlertCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          As fases macro são as <strong>colunas do Kanban</strong> do fornecedor. Cada atividade do modelo padrão é vinculada a uma fase macro.
        </p>
      </div>

      {/* Preview do pipeline */}
      <div className="bg-white rounded-2xl border p-5 mb-5">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Preview do Pipeline</p>
        <div className="flex items-center gap-2 flex-wrap">
          {sorted.map((mp, idx) => (
            <div key={mp.id} className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: `#${mp.color}` }}>
                <span>{mp.name}</span>
              </div>
              {idx < sorted.length - 1 && <span className="text-gray-300 text-lg">›</span>}
            </div>
          ))}
          {sorted.length === 0 && <p className="text-sm text-gray-400">Nenhuma fase macro criada ainda.</p>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden mb-4">
        <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <div className="col-span-1 text-center">Ordem</div>
          <div className="col-span-2">Cor</div>
          <div className="col-span-7">Nome</div>
          <div className="col-span-2 text-center">Ações</div>
        </div>
        {sorted.map(mp => (
          <div key={mp.id} className="grid grid-cols-12 gap-2 px-5 py-3 items-center border-t text-sm hover:bg-gray-50 transition-colors">
            <div className="col-span-1 text-center">
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center mx-auto">{mp.order}</span>
            </div>
            <div className="col-span-2">
              <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: `#${mp.color}` }} />
            </div>
            <div className="col-span-7">
              <span className="font-medium text-gray-800">{mp.name}</span>
            </div>
            <div className="col-span-2 flex justify-center gap-1">
              <button onClick={() => openEdit(mp)} className="text-gray-300 hover:text-brand transition-colors p-1"><Pencil size={13} /></button>
              <button onClick={() => confirm(`Excluir fase "${mp.name}"?`) && onDelete(mp.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {sorted.length === 0 && <div className="px-5 py-10 text-center text-gray-400 text-sm">Nenhuma fase macro cadastrada.</div>}
      </div>

      <Button onClick={openNew}><Plus size={14} /> Nova Fase Macro</Button>

      {modal && (
        <Modal title={modal === 'new' ? 'Nova Fase Macro' : 'Editar Fase Macro'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Ordem</label>
                <input className={inp} type="number" min={1} value={form.order} onChange={e => setForm(p => ({ ...p, order: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <label className={lbl}>Cor</label>
                <select className={inp} value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}>
                  {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={lbl}>Nome</label>
              <input className={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Documentação, Protocolo..." />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: `#${form.color}` }} />
              <span className="text-sm font-medium" style={{ color: `#${form.color}` }}>{form.name || 'Prévia da fase'}</span>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit">{modal === 'new' ? 'Criar' : 'Salvar'}</Button>
              <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── Aba Modelo Padrão ────────────────────────────────────────────────────────
function ModelTab({
  stages, macroPhases, onAdd, onUpdate, onDelete
}: {
  stages: DefaultStageTemplate[]
  macroPhases: MacroPhase[]
  onAdd: (s: Omit<DefaultStageTemplate, 'id'>) => void
  onUpdate: (id: string, data: Partial<DefaultStageTemplate>) => void
  onDelete: (id: string) => void
}) {
  const [modal, setModal] = useState<DefaultStageTemplate | 'new' | null>(null)
  const [form, setForm] = useState(EMPTY_STAGE)

  function openNew() {
    const nextOrder = Math.max(...stages.map(s => s.order), 0) + 1
    setForm({ ...EMPTY_STAGE, order: nextOrder })
    setModal('new')
  }
  function openEdit(s: DefaultStageTemplate) {
    setForm({ order: s.order, title: s.title, description: s.description ?? '', defaultDurationDays: s.defaultDurationDays, macroPhaseId: s.macroPhaseId ?? '' })
    setModal(s)
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { alert('Informe o título.'); return }
    if (modal === 'new') onAdd(form)
    else if (modal) onUpdate((modal as DefaultStageTemplate).id, form)
    setModal(null)
  }

  const sorted = [...stages].sort((a, b) => a.order - b.order)
  const totalDays = sorted.reduce((acc, s) => acc + s.defaultDurationDays, 0)

  return (
    <div>
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
        <AlertCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          Modelo base copiado ao criar novos tipos de subestação. Vincule cada atividade a uma <strong>fase macro</strong> para aparecer corretamente no Kanban.
        </p>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden mb-4">
        <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-4">Atividade</div>
          <div className="col-span-3">Fase Macro</div>
          <div className="col-span-2">Observação</div>
          <div className="col-span-1 text-center">Dias</div>
          <div className="col-span-1 text-center">Ações</div>
        </div>
        {sorted.map(s => {
          const phase = macroPhases.find(m => m.id === s.macroPhaseId)
          return (
            <div key={s.id} className="grid grid-cols-12 gap-2 px-5 py-3 items-center border-t text-sm hover:bg-gray-50 transition-colors">
              <div className="col-span-1 text-center">
                <span className="w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-bold flex items-center justify-center mx-auto">{s.order}</span>
              </div>
              <div className="col-span-4"><p className="font-medium text-gray-800 leading-snug">{s.title}</p></div>
              <div className="col-span-3">
                {phase
                  ? <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full text-white" style={{ backgroundColor: `#${phase.color}` }}>{phase.name}</span>
                  : <span className="text-xs text-gray-300">Não vinculada</span>}
              </div>
              <div className="col-span-2"><p className="text-gray-400 text-xs leading-snug">{s.description}</p></div>
              <div className="col-span-1 text-center">
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">{s.defaultDurationDays}d</span>
              </div>
              <div className="col-span-1 flex justify-center gap-1">
                <button onClick={() => openEdit(s)} className="text-gray-300 hover:text-brand transition-colors p-1"><Pencil size={13} /></button>
                <button onClick={() => confirm(`Excluir "${s.title}"?`) && onDelete(s.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1"><Trash2 size={13} /></button>
              </div>
            </div>
          )
        })}
        {sorted.length === 0 && <div className="px-5 py-10 text-center text-gray-400 text-sm">Nenhuma etapa no modelo.</div>}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{sorted.length} etapas · Prazo total <strong>{totalDays} dias</strong></p>
        <Button size="sm" onClick={openNew}><Plus size={14} /> Adicionar Etapa</Button>
      </div>

      {modal && (
        <Modal title={modal === 'new' ? 'Nova Etapa' : 'Editar Etapa'} onClose={() => setModal(null)}>
          <StageForm form={form} setForm={setForm} macroPhases={macroPhases} onSubmit={handleSubmit} onCancel={() => setModal(null)} isEdit={modal !== 'new'} />
        </Modal>
      )}
    </div>
  )
}

// ─── Aba Tipos de Subestação ──────────────────────────────────────────────────
function TypesTab({
  substationTypes, macroPhases, defaultStageModel,
  onAddType, onUpdateType, onDeleteType,
  onAddStage, onUpdateStage, onDeleteStage
}: {
  substationTypes: SubstationTypeConfig[]
  macroPhases: MacroPhase[]
  defaultStageModel: DefaultStageTemplate[]
  onAddType: (name: string, description?: string) => void
  onUpdateType: (id: string, data: Partial<Pick<SubstationTypeConfig, 'name' | 'description'>>) => void
  onDeleteType: (id: string) => void
  onAddStage: (typeId: string, stage: Omit<StageTemplate, 'id'>) => void
  onUpdateStage: (typeId: string, stageId: string, data: Partial<StageTemplate>) => void
  onDeleteStage: (typeId: string, stageId: string) => void
}) {
  const [expanded, setExpanded]       = useState<string | null>(null)
  const [newTypeModal, setNewTypeModal] = useState(false)
  const [newTypeForm, setNewTypeForm]   = useState({ name: '', description: '' })
  const [stageModal, setStageModal]     = useState<{ typeId: string; stage?: StageTemplate } | null>(null)
  const [stageForm, setStageForm]       = useState(EMPTY_STAGE)
  const [editingType, setEditingType]   = useState<{ id: string; name: string; description: string } | null>(null)

  function handleAddType(e: React.FormEvent) {
    e.preventDefault()
    if (!newTypeForm.name.trim()) { alert('Informe o nome.'); return }
    onAddType(newTypeForm.name.trim(), newTypeForm.description.trim() || undefined)
    setNewTypeForm({ name: '', description: '' })
    setNewTypeModal(false)
  }
  function openNewStage(typeId: string) {
    const type = substationTypes.find(t => t.id === typeId)
    const nextOrder = type ? Math.max(...type.stages.map(s => s.order), 0) + 1 : 1
    setStageForm({ ...EMPTY_STAGE, order: nextOrder })
    setStageModal({ typeId })
  }
  function openEditStage(typeId: string, stage: StageTemplate) {
    setStageForm({ order: stage.order, title: stage.title, description: stage.description ?? '', defaultDurationDays: stage.defaultDurationDays, macroPhaseId: stage.macroPhaseId ?? '' })
    setStageModal({ typeId, stage })
  }
  function handleSaveStage(e: React.FormEvent) {
    e.preventDefault()
    if (!stageModal || !stageForm.title.trim()) { alert('Informe o título.'); return }
    if (stageModal.stage) onUpdateStage(stageModal.typeId, stageModal.stage.id, stageForm)
    else onAddStage(stageModal.typeId, stageForm)
    setStageModal(null)
  }
  function handleSaveTypeName(e: React.FormEvent) {
    e.preventDefault()
    if (!editingType) return
    onUpdateType(editingType.id, { name: editingType.name, description: editingType.description })
    setEditingType(null)
  }

  const inp = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40'
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div>
      <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5">
        <AlertCircle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-700">
          Ao criar um novo tipo, ele recebe uma cópia do modelo padrão com as fases macro já vinculadas. Alterações não afetam projetos já criados.
        </p>
      </div>

      {substationTypes.length === 0 && (
        <div className="bg-white rounded-2xl border p-12 text-center text-gray-400 mb-4">
          <p className="text-sm font-medium">Nenhum tipo cadastrado.</p>
          <p className="text-xs mt-1">Clique em "Novo Tipo" para começar.</p>
        </div>
      )}

      <div className="flex flex-col gap-3 mb-4">
        {substationTypes.map(type => {
          const isExpanded = expanded === type.id
          const sorted = [...type.stages].sort((a, b) => a.order - b.order)
          const totalDays = sorted.reduce((acc, s) => acc + s.defaultDurationDays, 0)
          return (
            <div key={type.id} className="bg-white rounded-2xl border overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <button onClick={() => setExpanded(isExpanded ? null : type.id)} className="flex items-center gap-2 flex-1 text-left min-w-0">
                  {isExpanded ? <ChevronUp size={18} className="text-gray-400 shrink-0" /> : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{type.name}</p>
                    <p className="text-xs text-gray-400">{sorted.length} etapas · {totalDays} dias estimados{type.description ? ` · ${type.description}` : ''}</p>
                  </div>
                </button>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => setEditingType({ id: type.id, name: type.name, description: type.description ?? '' })}><Pencil size={13} /></Button>
                  <Button size="sm" variant="danger" onClick={() => confirm(`Excluir "${type.name}"?`) && onDeleteType(type.id)}><Trash2 size={13} /></Button>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t">
                  <div className="grid grid-cols-12 gap-2 px-5 py-2 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-4">Atividade</div>
                    <div className="col-span-3">Fase Macro</div>
                    <div className="col-span-2">Observação</div>
                    <div className="col-span-1 text-center">Dias</div>
                    <div className="col-span-1 text-center">Ações</div>
                  </div>
                  {sorted.map(s => {
                    const phase = macroPhases.find(m => m.id === s.macroPhaseId)
                    return (
                      <div key={s.id} className="grid grid-cols-12 gap-2 px-5 py-3 items-center border-t text-sm hover:bg-gray-50 transition-colors">
                        <div className="col-span-1 text-center">
                          <span className="w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-bold flex items-center justify-center mx-auto">{s.order}</span>
                        </div>
                        <div className="col-span-4"><p className="font-medium text-gray-800 leading-snug">{s.title}</p></div>
                        <div className="col-span-3">
                          {phase
                            ? <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full text-white" style={{ backgroundColor: `#${phase.color}` }}>{phase.name}</span>
                            : <span className="text-xs text-gray-300">Não vinculada</span>}
                        </div>
                        <div className="col-span-2"><p className="text-gray-400 text-xs leading-snug">{s.description}</p></div>
                        <div className="col-span-1 text-center">
                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">{s.defaultDurationDays}d</span>
                        </div>
                        <div className="col-span-1 flex justify-center gap-1">
                          <button onClick={() => openEditStage(type.id, s)} className="text-gray-300 hover:text-brand transition-colors p-1"><Pencil size={13} /></button>
                          <button onClick={() => confirm(`Excluir "${s.title}"?`) && onDeleteStage(type.id, s.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    )
                  })}
                  {sorted.length === 0 && <div className="px-5 py-8 text-center text-gray-400 text-sm border-t">Nenhuma etapa configurada.</div>}
                  <div className="px-5 py-3 border-t bg-gray-50">
                    <Button size="sm" variant="ghost" onClick={() => openNewStage(type.id)}><Plus size={14} /> Adicionar Etapa</Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Button onClick={() => setNewTypeModal(true)}><Plus size={15} /> Novo Tipo de Subestação</Button>

      {/* Modal novo tipo */}
      {newTypeModal && (
        <Modal title="Novo Tipo de Subestação" onClose={() => setNewTypeModal(false)}>
          <form onSubmit={handleAddType} className="flex flex-col gap-4">
            <div>
              <label className={lbl}>Nome</label>
              <input className={inp} value={newTypeForm.name} onChange={e => setNewTypeForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Subestação Abrigada de Médio" />
            </div>
            <div>
              <label className={lbl}>Descrição</label>
              <input className={inp} value={newTypeForm.description} onChange={e => setNewTypeForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
              {defaultStageModel.length} etapas do modelo padrão serão copiadas automaticamente, com as fases macro já vinculadas.
            </div>
            <div className="flex gap-2">
              <Button type="submit">Criar Tipo</Button>
              <Button type="button" variant="ghost" onClick={() => setNewTypeModal(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal editar tipo */}
      {editingType && (
        <Modal title="Editar Tipo" onClose={() => setEditingType(null)}>
          <form onSubmit={handleSaveTypeName} className="flex flex-col gap-4">
            <div>
              <label className={lbl}>Nome</label>
              <input className={inp} value={editingType.name} onChange={e => setEditingType(p => p ? { ...p, name: e.target.value } : null)} />
            </div>
            <div>
              <label className={lbl}>Descrição</label>
              <input className={inp} value={editingType.description} onChange={e => setEditingType(p => p ? { ...p, description: e.target.value } : null)} />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Salvar</Button>
              <Button type="button" variant="ghost" onClick={() => setEditingType(null)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal etapa */}
      {stageModal && (
        <Modal title={stageModal.stage ? 'Editar Etapa' : 'Nova Etapa'} onClose={() => setStageModal(null)}>
          <StageForm form={stageForm} setForm={setStageForm} macroPhases={macroPhases} onSubmit={handleSaveStage} onCancel={() => setStageModal(null)} isEdit={!!stageModal.stage} />
        </Modal>
      )}
    </div>
  )
}

// ─── Aba Tipos de Solicitação (NOVA) ─────────────────────────────────────────
function RequestTypesTab({
  requestTypes, onAdd, onUpdate, onDelete
}: {
  requestTypes: import('../types').RequestType[]
  onAdd: (name: string) => void
  onUpdate: (id: string, name: string) => void
  onDelete: (id: string) => void
}) {
  const [modal, setModal] = useState<{ id: string; name: string } | 'new' | null>(null)
  const [form, setForm] = useState('')

  function openNew() { setForm(''); setModal('new') }
  function openEdit(rt: import('../types').RequestType) { setForm(rt.name); setModal({ id: rt.id, name: rt.name }) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.trim()) { alert('Informe o nome.'); return }
    if (modal === 'new') onAdd(form.trim())
    else if (modal) onUpdate((modal as { id: string }).id, form.trim())
    setModal(null)
  }

  const inp = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40'
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div>
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
        <AlertCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          Os tipos de solicitação são usados para classificar os projetos no momento do cadastro. Ex: Ligação Nova MT, Aumento de Demanda, etc.
        </p>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden mb-4">
        <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <div className="col-span-9">Tipo de Solicitação</div>
          <div className="col-span-3 text-center">Ações</div>
        </div>
        {requestTypes.map(rt => (
          <div key={rt.id} className="grid grid-cols-12 gap-2 px-5 py-3 items-center border-t text-sm hover:bg-gray-50 transition-colors">
            <div className="col-span-9">
              <span className="font-medium text-gray-800">{rt.name}</span>
            </div>
            <div className="col-span-3 flex justify-center gap-1">
              <button onClick={() => openEdit(rt)} className="text-gray-300 hover:text-brand transition-colors p-1" aria-label="Editar"><Pencil size={13} /></button>
              <button onClick={() => confirm(`Excluir "${rt.name}"?`) && onDelete(rt.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1" aria-label="Excluir"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {requestTypes.length === 0 && (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">Nenhum tipo de solicitação cadastrado.</div>
        )}
      </div>

      <Button onClick={openNew}><Plus size={14} /> Novo Tipo de Solicitação</Button>

      {modal && (
        <Modal title={modal === 'new' ? 'Novo Tipo de Solicitação' : 'Editar Tipo de Solicitação'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className={lbl}>Nome</label>
              <input
                className={inp}
                value={form}
                onChange={e => setForm(e.target.value)}
                placeholder="Ex: Ligação Nova MT"
                autoFocus
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit">{modal === 'new' ? 'Criar' : 'Salvar'}</Button>
              <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── Formulário de etapa compartilhado ───────────────────────────────────────
function StageForm({ form, setForm, macroPhases, onSubmit, onCancel, isEdit }: {
  form: typeof EMPTY_STAGE
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_STAGE>>
  macroPhases: MacroPhase[]
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  isEdit: boolean
}) {
  const inp = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40'
  const lbl = 'block text-sm font-medium text-gray-700 mb-1'
  const selectedPhase = macroPhases.find(m => m.id === form.macroPhaseId)

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Ordem</label>
          <input className={inp} type="number" min={1} value={form.order} onChange={e => setForm(p => ({ ...p, order: parseInt(e.target.value) || 1 }))} />
        </div>
        <div>
          <label className={lbl}>Prazo estimado (dias)</label>
          <input className={inp} type="number" min={1} value={form.defaultDurationDays} onChange={e => setForm(p => ({ ...p, defaultDurationDays: parseInt(e.target.value) || 1 }))} />
        </div>
      </div>
      <div>
        <label className={lbl}>Título da Atividade</label>
        <input className={inp} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Elaboração do Projeto" />
      </div>
      <div>
        <label className={lbl}>Fase Macro</label>
        <select className={inp} value={form.macroPhaseId} onChange={e => setForm(p => ({ ...p, macroPhaseId: e.target.value }))}>
          <option value="">Sem fase macro</option>
          {[...macroPhases].sort((a, b) => a.order - b.order).map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        {selectedPhase && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `#${selectedPhase.color}` }} />
            <span className="text-xs font-medium" style={{ color: `#${selectedPhase.color}` }}>{selectedPhase.name}</span>
          </div>
        )}
      </div>
      <div>
        <label className={lbl}>Observação / Condição</label>
        <textarea className={inp} rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Ex: Se necessário, Se transformador ≥ 300 kVA..." />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit">{isEdit ? 'Salvar' : 'Adicionar'}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  )
}