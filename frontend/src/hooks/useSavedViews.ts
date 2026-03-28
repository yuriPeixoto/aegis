import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/axios'
import type { TicketFilters } from '../types/ticket'

export interface ViewFilters {
  status?: string
  active_only?: boolean
  priority?: string
  type?: string
  source_id?: number
  /** "me" | "unassigned" | null */
  assigned_to?: string | null
  tag_ids?: number[]
  search?: string
}

export interface SavedView {
  id: number
  name: string
  icon: string
  user_id: number | null
  is_shared: boolean
  filters: ViewFilters
  position: number
  created_at: string
}

export interface SavedViewCreate {
  name: string
  icon?: string
  is_shared?: boolean
  filters: ViewFilters
  position?: number
}

export function useSavedViews() {
  return useQuery<SavedView[]>({
    queryKey: ['saved-views'],
    queryFn: async () => {
      const { data } = await api.get<SavedView[]>('/views')
      return data
    },
    staleTime: 30_000,
  })
}

export function useCreateSavedView() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: SavedViewCreate) => {
      const { data } = await api.post<SavedView>('/views', payload)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-views'] }),
  })
}

export function useDeleteSavedView() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (viewId: number) => {
      await api.delete(`/views/${viewId}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-views'] }),
  })
}

/**
 * Translate a SavedView's filters into TicketFilters for the API,
 * resolving the special "me" assigned_to value.
 */
export function applyViewFilters(
  viewFilters: ViewFilters,
  currentUserId: number,
): TicketFilters {
  const result: TicketFilters = {}

  if (viewFilters.status)      result.status = viewFilters.status
  if (viewFilters.active_only) result.active_only = viewFilters.active_only
  if (viewFilters.priority)    result.priority = viewFilters.priority
  if (viewFilters.type)        result.type = viewFilters.type
  if (viewFilters.source_id)   result.source_id = viewFilters.source_id
  if (viewFilters.search)      result.search = viewFilters.search
  if (viewFilters.tag_ids?.length) result.tag_ids = viewFilters.tag_ids

  if (viewFilters.assigned_to === 'me') {
    result.assigned_to_user_id = currentUserId
  } else if (viewFilters.assigned_to === 'unassigned') {
    result.unassigned = true
  } else if (typeof viewFilters.assigned_to === 'number') {
    result.assigned_to_user_id = viewFilters.assigned_to
  }

  return result
}

/**
 * Snapshot the current TicketFilters (minus pagination/queue) into ViewFilters
 * for saving. Reverses the me/unassigned mapping best-effort.
 */
export function filtersToViewFilters(
  filters: TicketFilters,
  currentUserId: number,
): ViewFilters {
  const vf: ViewFilters = {}

  if (filters.status)      vf.status = filters.status
  if (filters.active_only) vf.active_only = filters.active_only
  if (filters.priority)    vf.priority = filters.priority
  if (filters.type)        vf.type = filters.type
  if (filters.source_id)   vf.source_id = filters.source_id
  if (filters.search)      vf.search = filters.search
  if (filters.tag_ids?.length) vf.tag_ids = filters.tag_ids

  if (filters.unassigned) {
    vf.assigned_to = 'unassigned'
  } else if (filters.assigned_to_user_id === currentUserId) {
    vf.assigned_to = 'me'
  } else if (filters.assigned_to_user_id) {
    vf.assigned_to = String(filters.assigned_to_user_id)
  }

  return vf
}
