import React, { createContext, useContext, useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import type {
  Client, Project, Reseller, Stage, SubstationTypeConfig,
  StageTemplate, DefaultStageTemplate, MacroPhase, RequestType
} from '../types'


function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch { return fallback }
}
function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}


export const DEFAULT_MACRO_PHASES: MacroPhase[] = [
  { id: 'mp1', order: 1, name: 'Documentação',   color: '3b82f6' },
  { id: 'mp2', order: 2, name: 'Protocolo',       color: 'f59e0b' },
  { id: 'mp3', order: 3, name: 'Projeto',          color: '8b5cf6' },
  { id: 'mp4', order: 4, name: 'Orçamento',        color: 'f97316' },
  { id: 'mp5', order: 5, name: 'Obra / Vistoria',  color: 'ec4899' },
  { id: 'mp6', order: 6, name: 'Concluído',        color: '10b981' },
]


export const DEFAULT_STAGE_MODEL: DefaultStageTemplate[] = [
  { id: 'ds1',  order: 1,  title: 'Visita Técnica',                                                                   defaultDurationDays: 2,  macroPhaseId: 'mp1' },
  { id: 'ds2',  order: 2,  title: 'Coleta de Documentos com o Cliente',                                               defaultDurationDays: 5,  macroPhaseId: 'mp1' },
  { id: 'ds3',  order: 3,  title: 'Assinatura dos Documentos pelo Cliente (ART, Formulários, Procuração)',             defaultDurationDays: 7,  macroPhaseId: 'mp1' },
  { id: 'ds4',  order: 4,  title: 'Elaboração do Croqui e Cálculo de Carga',                                          defaultDurationDays: 5,  macroPhaseId: 'mp1' },
  { id: 'ds5',  order: 5,  title: 'Envio da Documentação Celesc para Abertura de Protocolo',                          defaultDurationDays: 3,  macroPhaseId: 'mp2' },
  { id: 'ds6',  order: 6,  title: 'Solicitação de Consulta Prévia e Aguardar Aprovação',                              defaultDurationDays: 30, macroPhaseId: 'mp2' },
  { id: 'ds7',  order: 7,  title: 'Elaboração do Projeto / Envio / Aguardar Aprovação',                               defaultDurationDays: 15, macroPhaseId: 'mp3' },
  { id: 'ds8',  order: 8,  title: 'Elaboração do Estudo de Proteção / Envio / Aguardar Aprovação',                    defaultDurationDays: 10, macroPhaseId: 'mp3', description: 'Se transformador ≥ 300 kVA' },
  { id: 'ds9',  order: 9,  title: 'Aguardar Recebimento do Orçamento de Conexão / Carta Orçamentária',                defaultDurationDays: 30, macroPhaseId: 'mp4' },
  { id: 'ds10', order: 10, title: 'Melhoria de Rede / Retirada TC ou TC e TP / Vistoria e Comissionamento do Relé',   defaultDurationDays: 20, macroPhaseId: 'mp5', description: 'Se necessário' },
  { id: 'ds11', order: 11, title: 'Vistoria Final',                                                                   defaultDurationDays: 7,  macroPhaseId: 'mp5' },
]


const _now = new Date().toISOString()
export const DEFAULT_REQUEST_TYPES: RequestType[] = [
  { id: 'rt1', name: 'Ligação Nova MT',                    createdAt: _now },
  { id: 'rt2', name: 'Alteração/Adequação de Subestação',  createdAt: _now },
  { id: 'rt3', name: 'Aumento de Demanda',                 createdAt: _now },
  { id: 'rt4', name: 'Troca de Titularidade MT',           createdAt: _now },
  { id: 'rt5', name: 'Desligamento Programado',            createdAt: _now },
]


export function buildStagesFromConfig(config: SubstationTypeConfig, startDate?: string): Stage[] {
  let currentDate = startDate ? new Date(startDate) : new Date()
  return config.stages
    .sort((a, b) => a.order - b.order)
    .map(t => {
      const plannedStartDate = currentDate.toISOString()
      const duration = t.defaultDurationDays ?? 7
      const plannedEndDate = new Date(currentDate.getTime() + duration * 24 * 60 * 60 * 1000).toISOString()
      currentDate = new Date(plannedEndDate)
      return {
        id: uuid(), templateStageId: t.id, stageNumber: t.order,
        title: t.title, status: 'PENDING', macroPhaseId: t.macroPhaseId,
        plannedStartDate, plannedEndDate,
      } as Stage
    })
}


// ── Tipo do parâmetro de addProject ──────────────────────────────────────────
type AddProjectData = {
  title: string
  substationTypeId: string
  transformerKva?: number
  concessionaria: string
  clientId: string
  resellerId: string
  requestTypeId?: string   // ← ADICIONADO
  startDate?: string
  plannedEndDate?: string
}


interface AppContextType {
  macroPhases: MacroPhase[]
  addMacroPhase: (data: Omit<MacroPhase, 'id'>) => MacroPhase
  updateMacroPhase: (id: string, data: Partial<Omit<MacroPhase, 'id'>>) => void
  deleteMacroPhase: (id: string) => void
  defaultStageModel: DefaultStageTemplate[]
  addDefaultStage: (stage: Omit<DefaultStageTemplate, 'id'>) => void
  updateDefaultStage: (id: string, data: Partial<DefaultStageTemplate>) => void
  deleteDefaultStage: (id: string) => void
  substationTypes: SubstationTypeConfig[]
  addSubstationType: (name: string, description?: string) => SubstationTypeConfig
  updateSubstationType: (id: string, data: Partial<Pick<SubstationTypeConfig, 'name' | 'description'>>) => void
  deleteSubstationType: (id: string) => void
  addStageToType: (typeId: string, stage: Omit<StageTemplate, 'id'>) => void
  updateStageInType: (typeId: string, stageId: string, data: Partial<StageTemplate>) => void
  deleteStageFromType: (typeId: string, stageId: string) => void
  requestTypes: RequestType[]
  addRequestType: (name: string) => RequestType
  updateRequestType: (id: string, name: string) => void
  deleteRequestType: (id: string) => void
  resellers: Reseller[]
  addReseller: (data: Omit<Reseller, 'id' | 'createdAt' | 'updatedAt'>) => Reseller
  updateReseller: (id: string, data: Omit<Reseller, 'id' | 'createdAt' | 'updatedAt'>) => void
  deleteReseller: (id: string) => void
  clients: Client[]
  addClient: (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Client
  updateClient: (id: string, data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => void
  deleteClient: (id: string) => void
  projects: Project[]
  addProject: (data: AddProjectData) => Project   // ← USA O TIPO ATUALIZADO
  updateProject: (id: string, data: Partial<Pick<Project,
    'title' | 'substationTypeId' | 'transformerKva' | 'concessionaria' |
    'startDate' | 'plannedEndDate' | 'actualEndDate' | 'requestTypeId'>>) => void  // ← requestTypeId adicionado
  deleteProject: (id: string) => void
  updateProjectStage: (projectId: string, stageId: string, data: Partial<Stage>) => void
  updateProjectStatus: (projectId: string, status: Project['status']) => void
  advanceStage: (projectId: string) => void
}


const AppContext = createContext<AppContextType | null>(null)


export function AppProvider({ children }: { children: React.ReactNode }) {
  const [macroPhases,       setMacroPhases]       = useState<MacroPhase[]>(() =>           load('sm:macrophases',    DEFAULT_MACRO_PHASES))
  const [defaultStageModel, setDefaultStageModel] = useState<DefaultStageTemplate[]>(() => load('sm:defaultmodel',   DEFAULT_STAGE_MODEL))
  const [substationTypes,   setSubstationTypes]   = useState<SubstationTypeConfig[]>(() => load('sm:substationtypes',[]))
  const [requestTypes,      setRequestTypes]      = useState<RequestType[]>(() =>          load('sm:requesttypes',   DEFAULT_REQUEST_TYPES))
  const [resellers,         setResellers]         = useState<Reseller[]>(() =>             load('sm:resellers',      []))
  const [clients,           setClients]           = useState<Client[]>(() =>               load('sm:clients',        []))
  const [projects,          setProjects]          = useState<Project[]>(() =>              load('sm:projects',       []))


  useEffect(() => save('sm:macrophases',    macroPhases),       [macroPhases])
  useEffect(() => save('sm:defaultmodel',   defaultStageModel), [defaultStageModel])
  useEffect(() => save('sm:substationtypes',substationTypes),   [substationTypes])
  useEffect(() => save('sm:requesttypes',   requestTypes),      [requestTypes])
  useEffect(() => save('sm:resellers',      resellers),         [resellers])
  useEffect(() => save('sm:clients',        clients),           [clients])
  useEffect(() => save('sm:projects',       projects),          [projects])


  // Fases macro
  function addMacroPhase(data: Omit<MacroPhase, 'id'>): MacroPhase {
    const mp: MacroPhase = { ...data, id: uuid() }
    setMacroPhases(prev => [...prev, mp].sort((a, b) => a.order - b.order))
    return mp
  }
  function updateMacroPhase(id: string, data: Partial<Omit<MacroPhase, 'id'>>) {
    setMacroPhases(prev => prev.map(m => m.id === id ? { ...m, ...data } : m).sort((a, b) => a.order - b.order))
  }
  function deleteMacroPhase(id: string) {
    setMacroPhases(prev => prev.filter(m => m.id !== id))
  }


  // Modelo padrão
  function addDefaultStage(stage: Omit<DefaultStageTemplate, 'id'>) {
    setDefaultStageModel(prev => [...prev, { ...stage, id: uuid() }].sort((a, b) => a.order - b.order))
  }
  function updateDefaultStage(id: string, data: Partial<DefaultStageTemplate>) {
    setDefaultStageModel(prev => prev.map(s => s.id === id ? { ...s, ...data } : s).sort((a, b) => a.order - b.order))
  }
  function deleteDefaultStage(id: string) {
    setDefaultStageModel(prev => prev.filter(s => s.id !== id))
  }


  // Tipos de subestação
  function addSubstationType(name: string, description?: string): SubstationTypeConfig {
    const now = new Date().toISOString()
    const stages: StageTemplate[] = defaultStageModel.map(s => ({
      id: uuid(), order: s.order, title: s.title,
      description: s.description, defaultDurationDays: s.defaultDurationDays, macroPhaseId: s.macroPhaseId,
    }))
    const newType: SubstationTypeConfig = { id: uuid(), name, description, stages, createdAt: now, updatedAt: now }
    setSubstationTypes(prev => [...prev, newType])
    return newType
  }
  function updateSubstationType(id: string, data: Partial<Pick<SubstationTypeConfig, 'name' | 'description'>>) {
    setSubstationTypes(prev => prev.map(t => t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t))
  }
  function deleteSubstationType(id: string) {
    setSubstationTypes(prev => prev.filter(t => t.id !== id))
  }
  function addStageToType(typeId: string, stage: Omit<StageTemplate, 'id'>) {
    setSubstationTypes(prev => prev.map(t => t.id !== typeId ? t : {
      ...t, stages: [...t.stages, { ...stage, id: uuid() }].sort((a, b) => a.order - b.order),
      updatedAt: new Date().toISOString(),
    }))
  }
  function updateStageInType(typeId: string, stageId: string, data: Partial<StageTemplate>) {
    setSubstationTypes(prev => prev.map(t => t.id !== typeId ? t : {
      ...t, stages: t.stages.map(s => s.id === stageId ? { ...s, ...data } : s).sort((a, b) => a.order - b.order),
      updatedAt: new Date().toISOString(),
    }))
  }
  function deleteStageFromType(typeId: string, stageId: string) {
    setSubstationTypes(prev => prev.map(t => t.id !== typeId ? t : {
      ...t, stages: t.stages.filter(s => s.id !== stageId), updatedAt: new Date().toISOString(),
    }))
  }


  // Tipos de Solicitação
  function addRequestType(name: string): RequestType {
    const rt: RequestType = { id: uuid(), name, createdAt: new Date().toISOString() }
    setRequestTypes(prev => [...prev, rt])
    return rt
  }
  function updateRequestType(id: string, name: string) {
    setRequestTypes(prev => prev.map(r => r.id === id ? { ...r, name } : r))
  }
  function deleteRequestType(id: string) {
    setRequestTypes(prev => prev.filter(r => r.id !== id))
  }


  // Revendedores
  function addReseller(data: Omit<Reseller, 'id' | 'createdAt' | 'updatedAt'>): Reseller {
    const now = new Date().toISOString()
    const r: Reseller = { ...data, id: uuid(), createdAt: now, updatedAt: now }
    setResellers(prev => [...prev, r])
    return r
  }
  function updateReseller(id: string, data: Omit<Reseller, 'id' | 'createdAt' | 'updatedAt'>) {
    setResellers(prev => prev.map(r => r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r))
  }
  function deleteReseller(id: string) {
    setResellers(prev => prev.filter(r => r.id !== id))
  }


  // Clientes
  function addClient(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Client {
    const now = new Date().toISOString()
    const c: Client = { ...data, id: uuid(), createdAt: now, updatedAt: now }
    setClients(prev => [...prev, c])
    return c
  }
  function updateClient(id: string, data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c))
  }
  function deleteClient(id: string) {
    setClients(prev => prev.filter(c => c.id !== id))
  }


  // Projetos
  function addProject(data: AddProjectData): Project {
    const now = new Date().toISOString()
    const config = substationTypes.find(t => t.id === data.substationTypeId)
    const stages = config ? buildStagesFromConfig(config, data.startDate ?? now) : []
    const project: Project = {
      id: uuid(), ...data, status: 'IN_PROGRESS', currentStage: 1,
      stages, startDate: data.startDate ?? now, createdAt: now, updatedAt: now,
    }
    setProjects(prev => [...prev, project])
    return project
  }
  function updateProject(id: string, data: Partial<Pick<Project,
    'title' | 'substationTypeId' | 'transformerKva' | 'concessionaria' |
    'startDate' | 'plannedEndDate' | 'actualEndDate' | 'requestTypeId'>>) {
    setProjects(prev => prev.map(p => {
      if (p.id !== id) return p
      const updated = { ...p, ...data, updatedAt: new Date().toISOString() }
      if (data.substationTypeId) {
        const config = substationTypes.find(t => t.id === data.substationTypeId)
        if (config) { updated.stages = buildStagesFromConfig(config, p.startDate); updated.currentStage = 1 }
      }
      return updated
    }))
  }
  function deleteProject(id: string) {
    setProjects(prev => prev.filter(p => p.id !== id))
  }
  function updateProjectStage(projectId: string, stageId: string, data: Partial<Stage>) {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const stages = p.stages.map(s => {
        if (s.id !== stageId) return s
        const updated = { ...s, ...data }
        if (data.status === 'COMPLETED' && !s.completedAt)       updated.completedAt     = new Date().toISOString()
        if (data.status === 'IN_PROGRESS' && !s.actualStartDate) updated.actualStartDate = new Date().toISOString()
        return updated
      })
      return { ...p, stages, updatedAt: new Date().toISOString() }
    }))
  }
  function updateProjectStatus(projectId: string, status: Project['status']) {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const updated: Project = { ...p, status, updatedAt: new Date().toISOString() }
      if (status === 'COMPLETED') updated.actualEndDate = new Date().toISOString()
      return updated
    }))
  }
  function advanceStage(projectId: string) {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const next = Math.min(p.currentStage + 1, p.stages.length)
      return { ...p, currentStage: next, updatedAt: new Date().toISOString() }
    }))
  }


  return (
    <AppContext.Provider value={{
      macroPhases, addMacroPhase, updateMacroPhase, deleteMacroPhase,
      defaultStageModel, addDefaultStage, updateDefaultStage, deleteDefaultStage,
      substationTypes, addSubstationType, updateSubstationType, deleteSubstationType,
      addStageToType, updateStageInType, deleteStageFromType,
      requestTypes, addRequestType, updateRequestType, deleteRequestType,
      resellers, addReseller, updateReseller, deleteReseller,
      clients, addClient, updateClient, deleteClient,
      projects, addProject, updateProject, deleteProject,
      updateProjectStage, updateProjectStatus, advanceStage,
    }}>
      {children}
    </AppContext.Provider>
  )
}


export function useApp(): AppContextType {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider')
  return ctx
}
