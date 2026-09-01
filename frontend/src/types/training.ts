import type { AgentSlim, SourceSlim } from './calendar'

export type TrainingModality = 'presencial' | 'remoto'
export type TrainingType = 'inicial' | 'reciclagem' | 'atualizacao' | 'nova_funcionalidade'
export type TrainingStatus = 'draft' | 'completed'

export interface TrainingModule {
  module: string
  subjects: string
}

export interface TrainingParticipant {
  id: number
  name: string
  role_title: string | null
  sector: string | null
  signed_at: string | null
  confirmed_understanding: boolean
  signing_token: string
  token_expires_at: string
  has_signature: boolean
}

export interface TrainingRecord {
  id: number
  calendar_event_id: number | null
  source: SourceSlim | null
  training_name: string
  system_module: string
  version: string | null
  training_date: string
  start_time: string | null
  end_time: string | null
  workload_hours: string | null
  modality: TrainingModality
  training_type: TrainingType
  area_sector: string | null
  instructor: AgentSlim
  instructor_title: string | null
  modules: TrainingModule[]
  evaluation_method: string | null
  performance_notes: string | null
  general_notes: string | null
  status: TrainingStatus
  instructor_signed_at: string | null
  responsible_name: string | null
  responsible_signed_at: string | null
  created_at: string
  updated_at: string
  participants: TrainingParticipant[]
}

export interface TrainingRecordListItem {
  id: number
  training_name: string
  training_date: string
  modality: TrainingModality
  status: TrainingStatus
  source: SourceSlim | null
  instructor: AgentSlim
  participant_count: number
  signed_count: number
}

export interface TrainingRecordCreate {
  calendar_event_id?: number | null
  source_id?: number | null
  training_name: string
  system_module: string
  version?: string | null
  training_date: string
  start_time?: string | null
  end_time?: string | null
  workload_hours?: string | null
  modality: TrainingModality
  training_type: TrainingType
  area_sector?: string | null
  instructor_user_id: number
  instructor_title?: string | null
  modules?: TrainingModule[]
  evaluation_method?: string | null
  performance_notes?: string | null
  general_notes?: string | null
}

export type TrainingRecordUpdate = Partial<Omit<TrainingRecordCreate, 'calendar_event_id' | 'source_id'>>

export interface ParticipantCreate {
  name: string
  role_title?: string | null
  sector?: string | null
}

export interface PublicTrainingSummary {
  training_name: string
  system_module: string
  training_date: string
  start_time: string | null
  end_time: string | null
  workload_hours: string | null
  modality: TrainingModality
  instructor_name: string
  source_name: string | null
  participant_name: string
  participant_role_title: string | null
  participant_sector: string | null
  already_signed: boolean
}

export interface PublicSignRequest {
  name: string
  role_title?: string | null
  sector?: string | null
  confirmed_understanding: boolean
  signature_data: string
}
