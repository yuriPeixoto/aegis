import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/axios'
import type { User } from './useAuth'

export interface UserCreate {
  name: string
  email: string
  password: string
  role: string
}

export interface UserUpdate {
  role?: string
  is_active?: boolean
}

export function useAllUsers() {
  return useQuery<User[]>({
    queryKey: ['users', 'all'],
    queryFn: async () => {
      const { data } = await api.get<User[]>('/users')
      return data
    },
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UserCreate) => {
      const { data } = await api.post<User>('/users', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUpdateUser(userId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UserUpdate) => {
      const { data } = await api.patch<User>(`/users/${userId}`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (new_password: string) => {
      const { data } = await api.post<User>('/auth/change-password', { new_password })
      return data
    },
  })
}
