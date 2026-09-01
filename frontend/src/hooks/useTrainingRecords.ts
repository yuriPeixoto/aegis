import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/axios'
import type {
  ParticipantCreate,
  PublicSignRequest,
  PublicTrainingSummary,
  TrainingParticipant,
  TrainingRecord,
  TrainingRecordCreate,
  TrainingRecordListItem,
  TrainingRecordUpdate,
} from '../types/training'

export function useTrainingRecords(calendarEventId?: number) {
  return useQuery<TrainingRecordListItem[]>({
    queryKey: ['training-records', { calendarEventId }],
    queryFn: async () => {
      const params = calendarEventId ? `?calendar_event_id=${calendarEventId}` : ''
      const { data } = await api.get<TrainingRecordListItem[]>(`/training-records${params}`)
      return data
    },
  })
}

export function useTrainingRecord(id: number) {
  return useQuery<TrainingRecord>({
    queryKey: ['training-records', id],
    queryFn: async () => {
      const { data } = await api.get<TrainingRecord>(`/training-records/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateTrainingRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: TrainingRecordCreate) => {
      const { data } = await api.post<TrainingRecord>('/training-records', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-records'] })
    },
  })
}

export function useUpdateTrainingRecord(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: TrainingRecordUpdate) => {
      const { data } = await api.patch<TrainingRecord>(`/training-records/${id}`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-records'] })
    },
  })
}

export function useDeleteTrainingRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/training-records/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-records'] })
    },
  })
}

export function useAddParticipant(recordId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ParticipantCreate) => {
      const { data } = await api.post<TrainingParticipant>(
        `/training-records/${recordId}/participants`,
        payload,
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-records', recordId] })
    },
  })
}

export function useRemoveParticipant(recordId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (participantId: number) => {
      await api.delete(`/training-records/${recordId}/participants/${participantId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-records', recordId] })
    },
  })
}

export function useSignInstructor(recordId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (signatureData: string) => {
      const { data } = await api.post<TrainingRecord>(
        `/training-records/${recordId}/sign-instructor`,
        { signature_data: signatureData },
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-records', recordId] })
    },
  })
}

export function useSignResponsible(recordId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { responsible_name: string; signature_data: string }) => {
      const { data } = await api.post<TrainingRecord>(
        `/training-records/${recordId}/sign-responsible`,
        payload,
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-records', recordId] })
    },
  })
}

export function trainingPdfUrl(recordId: number): string {
  return `/v1/training-records/${recordId}/pdf`
}

// ── Public signing (unauthenticated, token-scoped) ─────────────────────────────

export function usePublicTrainingSummary(token: string) {
  return useQuery<PublicTrainingSummary>({
    queryKey: ['public-training-sign', token],
    queryFn: async () => {
      const { data } = await api.get<PublicTrainingSummary>(`/public/training-sign/${token}`)
      return data
    },
    enabled: !!token,
    retry: false,
  })
}

export function usePublicSign(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: PublicSignRequest) => {
      await api.post(`/public/training-sign/${token}`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-training-sign', token] })
    },
  })
}
