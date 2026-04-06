export type ProjectStatus = 'IN_PROGRESS' | 'WAITING' | 'COMPLETED' | 'CANCELLED'
export type StageStatus = 'PENDING' | 'IN_PROGRESS' | 'WAITING_APPROVAL' | 'COMPLETED' | 'SKIPPED'


export const STATUS_LABELS: Record<ProjectStatus, string> = {
  IN_PROGRESS: 'Em Andamento', WAITING: 'Aguardando',
  COMPLETED: 'Concluído', CANCELLED: 'Cancelado',
}
export const STAGE_STATUS_LABELS: Record<StageStatus, string> = {
  PENDING: 'Pendente', IN_PROGRESS: 'Em Andamento',
  WAITING_APPROVAL: 'Aguardando Aprovação', COMPLETED: 'Concluída', SKIPPED: 'N/A',
}


export interface MacroPhase {
  id: string; name: string; color: string; order: number
}
export interface DefaultStageTemplate {
  id: string; order: number; title: string; description?: string
  defaultDurationDays: number; macroPhaseId?: string
}
export interface StageTemplate {
  id: string; order: number; title: string; description?: string
  defaultDurationDays: number; macroPhaseId?: string
}
export interface SubstationTypeConfig {
  id: string; name: string; description?: string
  stages: StageTemplate[]; createdAt: string; updatedAt: string
}
export interface RequestType {
  id: string; name: string; createdAt: string
}
export interface Stage {
  id: string; templateStageId?: string; stageNumber: number; title: string
  status: StageStatus; macroPhaseId?: string; notes?: string; protocol?: string
  plannedStartDate?: string; plannedEndDate?: string
  actualStartDate?: string; completedAt?: string
}


// ── Responsável legal do cliente ─────────────────────────────────────────────
export interface ClientResponsible {
  id: string
  name: string
  role?: string    // cargo
  email?: string
  cpf?: string
}


// ── Cliente (expandido) ──────────────────────────────────────────────────────
export interface Client {
  id: string
  // Identificação
  name: string              // nome fantasia / nome de exibição
  razaoSocial?: string
  nomeFantasia?: string
  cpfCnpj: string
  // Contato
  email?: string
  phone?: string
  site?: string
  // Endereço
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  city?: string
  state?: string
  // Dados técnicos
  numeroUC?: string         // Número da Unidade Consumidora
  latitude?: string
  longitude?: string
  // Responsáveis legais
  responsibles: ClientResponsible[]
  // Vínculo
  resellerId: string
  // Legado (compat)
  address?: string
  observacoes?: string
  createdAt: string
  updatedAt: string
}


// ── Contato do revendedor ────────────────────────────────────────────────────
export interface ResellerContact {
  id: string; name: string; role?: string; phone?: string; email?: string
}


// ── Revendedor (expandido) ───────────────────────────────────────────────────
export interface Reseller {
  id: string
  cnpj?: string; razaoSocial?: string; nomeFantasia?: string; ie?: string
  cep?: string; logradouro?: string; numero?: string; complemento?: string
  bairro?: string; cidade?: string; estado?: string
  telefone?: string; email?: string; site?: string
  name: string; phone?: string
  contacts: ResellerContact[]
  observacoes?: string
  status: 'active' | 'inactive'
  createdAt: string; updatedAt: string
}


export interface Project {
  id: string; title: string; substationTypeId: string; transformerKva?: number
  concessionaria: string; status: ProjectStatus; currentStage: number
  clientId: string; resellerId: string; stages: Stage[]
  requestTypeId?: string                                        // ← ADICIONADO
  startDate?: string; plannedEndDate?: string; actualEndDate?: string
  createdAt: string; updatedAt: string
}
