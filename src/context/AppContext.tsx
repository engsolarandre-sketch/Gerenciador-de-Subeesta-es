import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { v4 as uuid } from 'uuid'
import { supabase } from '../lib/supabase'
import type {
  Client, Project, Reseller, Stage, SubstationTypeConfig,
  StageTemplate, DefaultStageTemplate, MacroPhase, RequestType
} from '../types'

// ─── Defaults (usados apenas para seed inicial se banco vazio) ────
export const DEFAULT_MACRO_PHASES: MacroPhase[] = [
  { id: 'mp1', order: 1, name: 'Documentação',  color: '3b82f6' },
  { id: 'mp2', order: 2, name: 'Protocolo',      color: 'f59e0b' },
  { id: 'mp3', order: 3, name: 'Projeto',         color: '8b5cf6' },
  { id: 'mp4', order: 4, name: 'Orçamento',       color: 'f97316' },
  { id: 'mp5', order: 5, name: 'Obra / Vistoria', color: 'ec4899' },
  { id: 'mp6', order: 6, name: 'Concluído',       color: '10b981' },
]

export const DEFAULT_STAGE_MODEL: DefaultStageTemplate[] = [
  { id: 'ds1',  order: 1,  title: 'Visita Técnica',                                                                 defaultDurationDays: 2,  macroPhaseId: 'mp1' },
  { id: 'ds2',  order: 2,  title: 'Coleta de Documentos com o Cliente',                                             defaultDurationDays: 5,  macroPhaseId: 'mp1' },
  { id: 'ds3',  order: 3,  title: 'Assinatura dos Documentos pelo Cliente (ART, Formulários, Procuração)',           defaultDurationDays: 7,  macroPhaseId: 'mp1' },
  { id: 'ds4',  order: 4,  title: 'Elaboração do Croqui e Cálculo de Carga',                                        defaultDurationDays: 5,  macroPhaseId: 'mp1' },
  { id: 'ds5',  order: 5,  title: 'Envio da Documentação Celesc para Abertura de Protocolo',                        defaultDurationDays: 3,  macroPhaseId: 'mp2' },
  { id: 'ds6',  order: 6,  title: 'Solicitação de Consulta Prévia e Aguardar Aprovação',                            defaultDurationDays: 30, macroPhaseId: 'mp2' },
  { id: 'ds7',  order: 7,  title: 'Elaboração do Projeto / Envio / Aguardar Aprovação',                             defaultDurationDays: 15, macroPhaseId: 'mp3' },
  { id: 'ds8',  order: 8,  title: 'Elaboração do Estudo de Proteção / Envio / Aguardar Aprovação',                  defaultDurationDays: 10, macroPhaseId: 'mp3', description: 'Se transformador ≥ 300 kVA' },
  { id: 'ds9',  order: 9,  title: 'Aguardar Recebimento do Orçamento de Conexão / Carta Orçamentária',              defaultDurationDays: 30, macroPhaseId: 'mp4' },
  { id: 'ds10', order: 10, title: 'Melhoria de Rede / Retirada TC ou TC e TP / Vistoria e Comissionamento do Relé', defaultDurationDays: 20, macroPhaseId: 'mp5', description: 'Se necessário' },
  { id: 'ds11', order: 11, title: 'Vistoria Final',                                                                 defaultDurationDays: 7,  macroPhaseId: 'mp5' },
]

const _now = new Date().toISOString()
export const DEFAULT_REQUEST_TYPES: RequestType[] = [
  { id: 'rt1', name: 'Ligação Nova MT',                   createdAt: _now },
  { id: 'rt2', name: 'Alteração/Adequação de Subestação', createdAt: _now },
  { id: 'rt3', name: 'Aumento de Demanda',                createdAt: _now },
  { id: 'rt4', name: 'Troca de Titularidade MT',          createdAt: _now },
  { id: 'rt5', name: 'Desligamento Programado',           createdAt: _now },
]

// ─── Helpers de mapeamento banco → app ───────────────────────────
function dbToMacroPhase(r: any): MacroPhase {
  return { id: r.id, name: r.name, color: r.color, order: r.order }
}
function dbToDefaultStage(r: any): DefaultStageTemplate {
  return { id: r.id, order: r.order, title: r.title, description: r.description ?? undefined, defaultDurationDays: r.default_duration_days, macroPhaseId: r.macro_phase_id ?? undefined }
}
function dbToRequestType(r: any): RequestType {
  return { id: r.id, name: r.name, createdAt: r.created_at }
}
function dbToResellerContact(r: any) {
  return { id: r.id, name: r.name, role: r.role ?? undefined, phone: r.phone ?? undefined, email: r.email ?? undefined }
}
function dbToReseller(r: any, contacts: any[]): Reseller {
  return {
    id: r.id, name: r.name, cnpj: r.cnpj ?? undefined, razaoSocial: r.razao_social ?? undefined,
    nomeFantasia: r.nome_fantasia ?? undefined, ie: r.ie ?? undefined,
    cep: r.cep ?? undefined, logradouro: r.logradouro ?? undefined, numero: r.numero ?? undefined,
    complemento: r.complemento ?? undefined, bairro: r.bairro ?? undefined,
    cidade: r.cidade ?? undefined, estado: r.estado ?? undefined,
    telefone: r.telefone ?? undefined, email: r.email ?? undefined, site: r.site ?? undefined,
    phone: r.phone ?? undefined, observacoes: r.observacoes ?? undefined,
    status: r.status as 'active' | 'inactive',
    contacts: contacts.filter(c => c.reseller_id === r.id).map(dbToResellerContact),
    createdAt: r.created_at, updatedAt: r.updated_at,
  }
}
function dbToClientResponsible(r: any) {
  return { id: r.id, name: r.name, role: r.role ?? undefined, email: r.email ?? undefined, cpf: r.cpf ?? undefined }
}
function dbToClient(r: any, responsibles: any[]): Client {
  return {
    id: r.id, name: r.name, razaoSocial: r.razao_social ?? undefined,
    nomeFantasia: r.nome_fantasia ?? undefined, cpfCnpj: r.cpf_cnpj,
    email: r.email ?? undefined, phone: r.phone ?? undefined, site: r.site ?? undefined,
    cep: r.cep ?? undefined, logradouro: r.logradouro ?? undefined, numero: r.numero ?? undefined,
    complemento: r.complemento ?? undefined, bairro: r.bairro ?? undefined,
    city: r.city ?? undefined, state: r.state ?? undefined, address: r.address ?? undefined,
    numeroUC: r.numero_uc ?? undefined, latitude: r.latitude ?? undefined,
    longitude: r.longitude ?? undefined, observacoes: r.observacoes ?? undefined,
    resellerId: r.reseller_id,
    responsibles: responsibles.filter(rp => rp.client_id === r.id).map(dbToClientResponsible),
    createdAt: r.created_at, updatedAt: r.updated_at,
  }
}
function dbToStage(r: any): Stage {
  return {
    id: r.id, templateStageId: r.template_stage_id ?? undefined,
    stageNumber: r.stage_number, title: r.title, status: r.status as Stage['status'],
    macroPhaseId: r.macro_phase_id ?? undefined, notes: r.notes ?? undefined,
    protocol: r.protocol ?? undefined,
    plannedStartDate: r.planned_start_date ?? undefined, plannedEndDate: r.planned_end_date ?? undefined,
    actualStartDate: r.actual_start_date ?? undefined, completedAt: r.completed_at ?? undefined,
  }
}
function dbToProject(r: any, stages: any[]): Project {
  return {
    id: r.id, title: r.title, substationTypeId: r.substation_type_id ?? '',
    requestTypeId: r.request_type_id ?? undefined,
    transformerKva: r.transformer_kva ?? undefined, concessionaria: r.concessionaria,
    status: r.status as Project['status'], currentStage: r.current_stage,
    clientId: r.client_id ?? '', resellerId: r.reseller_id ?? '',
    stages: stages.filter(s => s.project_id === r.id).map(dbToStage).sort((a, b) => a.stageNumber - b.stageNumber),
    startDate: r.start_date ?? undefined, plannedEndDate: r.planned_end_date ?? undefined,
    actualEndDate: r.actual_end_date ?? undefined,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }
}
function dbToSubstationType(r: any, templates: any[]): SubstationTypeConfig {
  return {
    id: r.id, name: r.name, description: r.description ?? undefined,
    stages: templates.filter(t => t.substation_type_id === r.id).map(t => ({
      id: t.id, order: t.order, title: t.title, description: t.description ?? undefined,
      defaultDurationDays: t.default_duration_days, macroPhaseId: t.macro_phase_id ?? undefined,
    } as StageTemplate)).sort((a, b) => a.order - b.order),
    createdAt: r.created_at, updatedAt: r.updated_at,
  }
}

// ─── buildStagesFromConfig ────────────────────────────────────────
export function buildStagesFromConfig(config: SubstationTypeConfig, startDate?: string): Stage[] {
  let currentDate = startDate ? new Date(startDate) : new Date()
  return config.stages
    .sort((a, b) => a.order - b.order)
    .map(t => {
      const plannedStartDate = currentDate.toISOString()
      const duration = t.defaultDurationDays ?? 7
      const plannedEndDate = new Date(currentDate.getTime() + duration * 86400000).toISOString()
      currentDate = new Date(plannedEndDate)
      return {
        id: uuid(), templateStageId: t.id, stageNumber: t.order,
        title: t.title, status: 'PENDING', macroPhaseId: t.macroPhaseId,
        plannedStartDate, plannedEndDate,
      } as Stage
    })
}

// ─── AddProjectData ───────────────────────────────────────────────
type AddProjectData = {
  title: string; substationTypeId: string; transformerKva?: number
  concessionaria: string; clientId: string; resellerId: string
  requestTypeId?: string; startDate?: string; plannedEndDate?: string
}

// ─── Context type ─────────────────────────────────────────────────
interface AppContextType {
  loading: boolean
  macroPhases: MacroPhase[]
  addMacroPhase: (data: Omit<MacroPhase, 'id'>) => Promise<MacroPhase>
  updateMacroPhase: (id: string, data: Partial<Omit<MacroPhase, 'id'>>) => Promise<void>
  deleteMacroPhase: (id: string) => Promise<void>
  defaultStageModel: DefaultStageTemplate[]
  addDefaultStage: (stage: Omit<DefaultStageTemplate, 'id'>) => Promise<void>
  updateDefaultStage: (id: string, data: Partial<DefaultStageTemplate>) => Promise<void>
  deleteDefaultStage: (id: string) => Promise<void>
  substationTypes: SubstationTypeConfig[]
  addSubstationType: (name: string, description?: string) => Promise<SubstationTypeConfig>
  updateSubstationType: (id: string, data: Partial<Pick<SubstationTypeConfig, 'name' | 'description'>>) => Promise<void>
  deleteSubstationType: (id: string) => Promise<void>
  addStageToType: (typeId: string, stage: Omit<StageTemplate, 'id'>) => Promise<void>
  updateStageInType: (typeId: string, stageId: string, data: Partial<StageTemplate>) => Promise<void>
  deleteStageFromType: (typeId: string, stageId: string) => Promise<void>
  requestTypes: RequestType[]
  addRequestType: (name: string) => Promise<RequestType>
  updateRequestType: (id: string, name: string) => Promise<void>
  deleteRequestType: (id: string) => Promise<void>
  resellers: Reseller[]
  addReseller: (data: Omit<Reseller, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Reseller>
  updateReseller: (id: string, data: Omit<Reseller, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  deleteReseller: (id: string) => Promise<void>
  clients: Client[]
  addClient: (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Client>
  updateClient: (id: string, data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  deleteClient: (id: string) => Promise<void>
  projects: Project[]
  addProject: (data: AddProjectData) => Promise<Project>
  updateProject: (id: string, data: Partial<Pick<Project,
    'title' | 'substationTypeId' | 'transformerKva' | 'concessionaria' |
    'startDate' | 'plannedEndDate' | 'actualEndDate' | 'requestTypeId'>>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  updateProjectStage: (projectId: string, stageId: string, data: Partial<Stage>) => Promise<void>
  updateProjectStatus: (projectId: string, status: Project['status']) => Promise<void>
  advanceStage: (projectId: string) => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

// ─── Provider ────────────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading,           setLoading]           = useState(true)
  const [macroPhases,       setMacroPhases]        = useState<MacroPhase[]>([])
  const [defaultStageModel, setDefaultStageModel]  = useState<DefaultStageTemplate[]>([])
  const [substationTypes,   setSubstationTypes]    = useState<SubstationTypeConfig[]>([])
  const [requestTypes,      setRequestTypes]       = useState<RequestType[]>([])
  const [resellers,         setResellers]          = useState<Reseller[]>([])
  const [clients,           setClients]            = useState<Client[]>([])
  const [projects,          setProjects]           = useState<Project[]>([])

  // ── Carrega tudo do banco uma vez ──────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [
        { data: mpData },
        { data: dsData },
        { data: stData },
        { data: tplData },
        { data: rtData },
        { data: reData },
        { data: rcData },
        { data: clData },
        { data: crData },
        { data: prData },
        { data: sgData },
      ] = await Promise.all([
        supabase.from('macro_phases').select('*').order('order'),
        supabase.from('default_stage_model').select('*').order('order'),
        supabase.from('substation_types').select('*').order('created_at'),
        supabase.from('stage_templates').select('*').order('order'),
        supabase.from('request_types').select('*').order('created_at'),
        supabase.from('resellers').select('*').order('name'),
        supabase.from('reseller_contacts').select('*'),
        supabase.from('clients').select('*').order('name'),
        supabase.from('client_responsibles').select('*'),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('stages').select('*').order('stage_number'),
      ])

      const mps = (mpData ?? []).map(dbToMacroPhase)
      const dss = (dsData ?? []).map(dbToDefaultStage)
      const sts = (stData ?? []).map(r => dbToSubstationType(r, tplData ?? []))
      const rts = (rtData ?? []).map(dbToRequestType)
      const res = (reData ?? []).map(r => dbToReseller(r, rcData ?? []))
      const cls = (clData ?? []).map(r => dbToClient(r, crData ?? []))
      const prs = (prData ?? []).map(r => dbToProject(r, sgData ?? []))

      // Seed defaults se banco vazio
      if (mps.length === 0) await seedDefaults()

      setMacroPhases(mps.length > 0 ? mps : DEFAULT_MACRO_PHASES)
      setDefaultStageModel(dss.length > 0 ? dss : DEFAULT_STAGE_MODEL)
      setSubstationTypes(sts)
      setRequestTypes(rts.length > 0 ? rts : DEFAULT_REQUEST_TYPES)
      setResellers(res)
      setClients(cls)
      setProjects(prs)
    } finally {
      setLoading(false)
    }
  }, [])

  async function seedDefaults() {
    await supabase.from('macro_phases').insert(
      DEFAULT_MACRO_PHASES.map(m => ({ id: m.id, name: m.name, color: m.color, order: m.order }))
    )
    await supabase.from('default_stage_model').insert(
      DEFAULT_STAGE_MODEL.map(s => ({
        id: s.id, order: s.order, title: s.title,
        description: s.description ?? null,
        default_duration_days: s.defaultDurationDays,
        macro_phase_id: s.macroPhaseId ?? null,
      }))
    )
    await supabase.from('request_types').insert(
      DEFAULT_REQUEST_TYPES.map(r => ({ id: r.id, name: r.name }))
    )
  }

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Macro Phases ───────────────────────────────────────────────
  async function addMacroPhase(data: Omit<MacroPhase, 'id'>): Promise<MacroPhase> {
    const id = uuid()
    await supabase.from('macro_phases').insert({ id, name: data.name, color: data.color, order: data.order })
    const mp: MacroPhase = { ...data, id }
    setMacroPhases(prev => [...prev, mp].sort((a, b) => a.order - b.order))
    return mp
  }
  async function updateMacroPhase(id: string, data: Partial<Omit<MacroPhase, 'id'>>) {
    await supabase.from('macro_phases').update({ name: data.name, color: data.color, order: data.order }).eq('id', id)
    setMacroPhases(prev => prev.map(m => m.id === id ? { ...m, ...data } : m).sort((a, b) => a.order - b.order))
  }
  async function deleteMacroPhase(id: string) {
    await supabase.from('macro_phases').delete().eq('id', id)
    setMacroPhases(prev => prev.filter(m => m.id !== id))
  }

  // ── Default Stage Model ────────────────────────────────────────
  async function addDefaultStage(stage: Omit<DefaultStageTemplate, 'id'>) {
    const id = uuid()
    await supabase.from('default_stage_model').insert({
      id, order: stage.order, title: stage.title, description: stage.description ?? null,
      default_duration_days: stage.defaultDurationDays, macro_phase_id: stage.macroPhaseId ?? null,
    })
    setDefaultStageModel(prev => [...prev, { ...stage, id }].sort((a, b) => a.order - b.order))
  }
  async function updateDefaultStage(id: string, data: Partial<DefaultStageTemplate>) {
    await supabase.from('default_stage_model').update({
      order: data.order, title: data.title, description: data.description ?? null,
      default_duration_days: data.defaultDurationDays, macro_phase_id: data.macroPhaseId ?? null,
    }).eq('id', id)
    setDefaultStageModel(prev => prev.map(s => s.id === id ? { ...s, ...data } : s).sort((a, b) => a.order - b.order))
  }
  async function deleteDefaultStage(id: string) {
    await supabase.from('default_stage_model').delete().eq('id', id)
    setDefaultStageModel(prev => prev.filter(s => s.id !== id))
  }

  // ── Substation Types ───────────────────────────────────────────
  async function addSubstationType(name: string, description?: string): Promise<SubstationTypeConfig> {
    const now = new Date().toISOString()
    const id = uuid()
    await supabase.from('substation_types').insert({ id, name, description: description ?? null })
    const templates = defaultStageModel.map(s => ({
      id: uuid(), substation_type_id: id, order: s.order, title: s.title,
      description: s.description ?? null, default_duration_days: s.defaultDurationDays,
      macro_phase_id: s.macroPhaseId ?? null,
    }))
    if (templates.length > 0) await supabase.from('stage_templates').insert(templates)
    const newType: SubstationTypeConfig = {
      id, name, description,
      stages: templates.map(t => ({
        id: t.id, order: t.order, title: t.title, description: t.description ?? undefined,
        defaultDurationDays: t.default_duration_days, macroPhaseId: t.macro_phase_id ?? undefined,
      })),
      createdAt: now, updatedAt: now,
    }
    setSubstationTypes(prev => [...prev, newType])
    return newType
  }
  async function updateSubstationType(id: string, data: Partial<Pick<SubstationTypeConfig, 'name' | 'description'>>) {
    await supabase.from('substation_types').update({ name: data.name, description: data.description ?? null }).eq('id', id)
    setSubstationTypes(prev => prev.map(t => t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t))
  }
  async function deleteSubstationType(id: string) {
    await supabase.from('substation_types').delete().eq('id', id)
    setSubstationTypes(prev => prev.filter(t => t.id !== id))
  }
  async function addStageToType(typeId: string, stage: Omit<StageTemplate, 'id'>) {
    const id = uuid()
    await supabase.from('stage_templates').insert({
      id, substation_type_id: typeId, order: stage.order, title: stage.title,
      description: stage.description ?? null, default_duration_days: stage.defaultDurationDays,
      macro_phase_id: stage.macroPhaseId ?? null,
    })
    setSubstationTypes(prev => prev.map(t => t.id !== typeId ? t : {
      ...t, stages: [...t.stages, { ...stage, id }].sort((a, b) => a.order - b.order),
      updatedAt: new Date().toISOString(),
    }))
  }
  async function updateStageInType(typeId: string, stageId: string, data: Partial<StageTemplate>) {
    await supabase.from('stage_templates').update({
      order: data.order, title: data.title, description: data.description ?? null,
      default_duration_days: data.defaultDurationDays, macro_phase_id: data.macroPhaseId ?? null,
    }).eq('id', stageId)
    setSubstationTypes(prev => prev.map(t => t.id !== typeId ? t : {
      ...t, stages: t.stages.map(s => s.id === stageId ? { ...s, ...data } : s).sort((a, b) => a.order - b.order),
      updatedAt: new Date().toISOString(),
    }))
  }
  async function deleteStageFromType(typeId: string, stageId: string) {
    await supabase.from('stage_templates').delete().eq('id', stageId)
    setSubstationTypes(prev => prev.map(t => t.id !== typeId ? t : {
      ...t, stages: t.stages.filter(s => s.id !== stageId), updatedAt: new Date().toISOString(),
    }))
  }

  // ── Request Types ──────────────────────────────────────────────
  async function addRequestType(name: string): Promise<RequestType> {
    const id = uuid()
    const { data } = await supabase.from('request_types').insert({ id, name }).select().single()
    const rt = dbToRequestType(data)
    setRequestTypes(prev => [...prev, rt])
    return rt
  }
  async function updateRequestType(id: string, name: string) {
    await supabase.from('request_types').update({ name }).eq('id', id)
    setRequestTypes(prev => prev.map(r => r.id === id ? { ...r, name } : r))
  }
  async function deleteRequestType(id: string) {
    await supabase.from('request_types').delete().eq('id', id)
    setRequestTypes(prev => prev.filter(r => r.id !== id))
  }

  // ── Resellers ──────────────────────────────────────────────────
  async function addReseller(data: Omit<Reseller, 'id' | 'createdAt' | 'updatedAt'>): Promise<Reseller> {
    const id = uuid()
    const { contacts, ...rest } = data
    await supabase.from('resellers').insert({
      id, name: rest.name, cnpj: rest.cnpj ?? null, razao_social: rest.razaoSocial ?? null,
      nome_fantasia: rest.nomeFantasia ?? null, ie: rest.ie ?? null,
      cep: rest.cep ?? null, logradouro: rest.logradouro ?? null, numero: rest.numero ?? null,
      complemento: rest.complemento ?? null, bairro: rest.bairro ?? null,
      cidade: rest.cidade ?? null, estado: rest.estado ?? null,
      telefone: rest.telefone ?? null, email: rest.email ?? null, site: rest.site ?? null,
      phone: rest.phone ?? null, observacoes: rest.observacoes ?? null, status: rest.status,
    })
    if (contacts?.length > 0) {
      await supabase.from('reseller_contacts').insert(
        contacts.map(c => ({ id: c.id || uuid(), reseller_id: id, name: c.name, role: c.role ?? null, phone: c.phone ?? null, email: c.email ?? null }))
      )
    }
    const now = new Date().toISOString()
    const reseller: Reseller = { ...data, id, createdAt: now, updatedAt: now }
    setResellers(prev => [...prev, reseller])
    return reseller
  }
  async function updateReseller(id: string, data: Omit<Reseller, 'id' | 'createdAt' | 'updatedAt'>) {
    const { contacts, ...rest } = data
    await supabase.from('resellers').update({
      name: rest.name, cnpj: rest.cnpj ?? null, razao_social: rest.razaoSocial ?? null,
      nome_fantasia: rest.nomeFantasia ?? null, ie: rest.ie ?? null,
      cep: rest.cep ?? null, logradouro: rest.logradouro ?? null, numero: rest.numero ?? null,
      complemento: rest.complemento ?? null, bairro: rest.bairro ?? null,
      cidade: rest.cidade ?? null, estado: rest.estado ?? null,
      telefone: rest.telefone ?? null, email: rest.email ?? null, site: rest.site ?? null,
      phone: rest.phone ?? null, observacoes: rest.observacoes ?? null, status: rest.status,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    await supabase.from('reseller_contacts').delete().eq('reseller_id', id)
    if (contacts?.length > 0) {
      await supabase.from('reseller_contacts').insert(
        contacts.map(c => ({ id: c.id || uuid(), reseller_id: id, name: c.name, role: c.role ?? null, phone: c.phone ?? null, email: c.email ?? null }))
      )
    }
    setResellers(prev => prev.map(r => r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r))
  }
  async function deleteReseller(id: string) {
    await supabase.from('resellers').delete().eq('id', id)
    setResellers(prev => prev.filter(r => r.id !== id))
  }

  // ── Clients ────────────────────────────────────────────────────
  async function addClient(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    const id = uuid()
    const { responsibles, ...rest } = data
    await supabase.from('clients').insert({
      id, reseller_id: rest.resellerId, name: rest.name,
      razao_social: rest.razaoSocial ?? null, nome_fantasia: rest.nomeFantasia ?? null,
      cpf_cnpj: rest.cpfCnpj, email: rest.email ?? null, phone: rest.phone ?? null,
      site: rest.site ?? null, cep: rest.cep ?? null, logradouro: rest.logradouro ?? null,
      numero: rest.numero ?? null, complemento: rest.complemento ?? null, bairro: rest.bairro ?? null,
      city: rest.city ?? null, state: rest.state ?? null, address: rest.address ?? null,
      numero_uc: rest.numeroUC ?? null, latitude: rest.latitude ?? null,
      longitude: rest.longitude ?? null, observacoes: rest.observacoes ?? null,
    })
    if (responsibles?.length > 0) {
      await supabase.from('client_responsibles').insert(
        responsibles.map(r => ({ id: r.id || uuid(), client_id: id, name: r.name, role: r.role ?? null, email: r.email ?? null, cpf: r.cpf ?? null }))
      )
    }
    const now = new Date().toISOString()
    const client: Client = { ...data, id, createdAt: now, updatedAt: now }
    setClients(prev => [...prev, client])
    return client
  }
  async function updateClient(id: string, data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) {
    const { responsibles, ...rest } = data
    await supabase.from('clients').update({
      reseller_id: rest.resellerId, name: rest.name,
      razao_social: rest.razaoSocial ?? null, nome_fantasia: rest.nomeFantasia ?? null,
      cpf_cnpj: rest.cpfCnpj, email: rest.email ?? null, phone: rest.phone ?? null,
      site: rest.site ?? null, cep: rest.cep ?? null, logradouro: rest.logradouro ?? null,
      numero: rest.numero ?? null, complemento: rest.complemento ?? null, bairro: rest.bairro ?? null,
      city: rest.city ?? null, state: rest.state ?? null, address: rest.address ?? null,
      numero_uc: rest.numeroUC ?? null, latitude: rest.latitude ?? null,
      longitude: rest.longitude ?? null, observacoes: rest.observacoes ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    await supabase.from('client_responsibles').delete().eq('client_id', id)
    if (responsibles?.length > 0) {
      await supabase.from('client_responsibles').insert(
        responsibles.map(r => ({ id: r.id || uuid(), client_id: id, name: r.name, role: r.role ?? null, email: r.email ?? null, cpf: r.cpf ?? null }))
      )
    }
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c))
  }
  async function deleteClient(id: string) {
    await supabase.from('clients').delete().eq('id', id)
    setClients(prev => prev.filter(c => c.id !== id))
  }

  // ── Projects ───────────────────────────────────────────────────
  async function addProject(data: AddProjectData): Promise<Project> {
    const now = new Date().toISOString()
    const id = uuid()
    const config = substationTypes.find(t => t.id === data.substationTypeId)
    const stages = config ? buildStagesFromConfig(config, data.startDate ?? now) : []
    await supabase.from('projects').insert({
      id, title: data.title, substation_type_id: data.substationTypeId || null,
      request_type_id: data.requestTypeId ?? null,
      transformer_kva: data.transformerKva ?? null, concessionaria: data.concessionaria,
      status: 'IN_PROGRESS', current_stage: 1,
      client_id: data.clientId || null, reseller_id: data.resellerId || null,
      start_date: data.startDate ?? now, planned_end_date: data.plannedEndDate ?? null,
    })
    if (stages.length > 0) {
      await supabase.from('stages').insert(stages.map(s => ({
        id: s.id, project_id: id, template_stage_id: s.templateStageId ?? null,
        stage_number: s.stageNumber, title: s.title, status: s.status,
        macro_phase_id: s.macroPhaseId ?? null,
        planned_start_date: s.plannedStartDate ?? null, planned_end_date: s.plannedEndDate ?? null,
      })))
    }
    const project: Project = {
      id, ...data, status: 'IN_PROGRESS', currentStage: 1,
      stages, startDate: data.startDate ?? now, createdAt: now, updatedAt: now,
    }
    setProjects(prev => [project, ...prev])
    return project
  }
  async function updateProject(id: string, data: Partial<Pick<Project,
    'title' | 'substationTypeId' | 'transformerKva' | 'concessionaria' |
    'startDate' | 'plannedEndDate' | 'actualEndDate' | 'requestTypeId'>>) {
    await supabase.from('projects').update({
      title: data.title, substation_type_id: data.substationTypeId,
      request_type_id: data.requestTypeId ?? null,
      transformer_kva: data.transformerKva ?? null, concessionaria: data.concessionaria,
      start_date: data.startDate, planned_end_date: data.plannedEndDate ?? null,
      actual_end_date: data.actualEndDate ?? null, updated_at: new Date().toISOString(),
    }).eq('id', id)
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
  async function deleteProject(id: string) {
    await supabase.from('projects').delete().eq('id', id)
    setProjects(prev => prev.filter(p => p.id !== id))
  }
  async function updateProjectStage(projectId: string, stageId: string, data: Partial<Stage>) {
    const now = new Date().toISOString()
    const stageUpdate: any = {
      status: data.status, notes: data.notes ?? null, protocol: data.protocol ?? null,
      planned_start_date: data.plannedStartDate ?? null, planned_end_date: data.plannedEndDate ?? null,
      updated_at: now,
    }
    if (data.status === 'COMPLETED') stageUpdate.completed_at = now
    if (data.status === 'IN_PROGRESS') stageUpdate.actual_start_date = now
    await supabase.from('stages').update(stageUpdate).eq('id', stageId)
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const stages = p.stages.map(s => {
        if (s.id !== stageId) return s
        const updated = { ...s, ...data }
        if (data.status === 'COMPLETED' && !s.completedAt)       updated.completedAt     = now
        if (data.status === 'IN_PROGRESS' && !s.actualStartDate) updated.actualStartDate = now
        return updated
      })
      return { ...p, stages, updatedAt: now }
    }))
  }
  async function updateProjectStatus(projectId: string, status: Project['status']) {
    const now = new Date().toISOString()
    const update: any = { status, updated_at: now }
    if (status === 'COMPLETED') update.actual_end_date = now
    await supabase.from('projects').update(update).eq('id', projectId)
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      const updated: Project = { ...p, status, updatedAt: now }
      if (status === 'COMPLETED') updated.actualEndDate = now
      return updated
    }))
  }
  async function advanceStage(projectId: string) {
    const project = projects.find(p => p.id === projectId)
    if (!project) return
    const next = Math.min(project.currentStage + 1, project.stages.length)
    await supabase.from('projects').update({ current_stage: next, updated_at: new Date().toISOString() }).eq('id', projectId)
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, currentStage: next, updatedAt: new Date().toISOString() } : p))
  }

  return (
    <AppContext.Provider value={{
      loading,
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
