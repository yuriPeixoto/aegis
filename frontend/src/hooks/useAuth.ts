import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/axios'

export interface User {
  id: number
  email: string
  name: string
  role: string
  is_active: boolean
  is_senior: boolean
  must_change_password: boolean
  created_at: string
}

interface LoginCredentials {
  email: string
  password: string
}

interface LoginResponse {
  access_token: string
  must_change_password: boolean
}

export function useMe() {
  return useQuery<User>({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get<User>('/auth/me')
      return data
    },
    retry: false,
    enabled: !!localStorage.getItem('aegis_token'),
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const { data } = await api.post<LoginResponse>('/auth/login', credentials)
      return data
    },
    onSuccess: (data) => {
      localStorage.setItem('aegis_token', data.access_token)
      queryClient.invalidateQueries({ queryKey: ['me'] })
      if (data.must_change_password) {
        navigate('/change-password')
      } else {
        navigate('/')
      }
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return () => {
    localStorage.removeItem('aegis_token')
    queryClient.clear()
    navigate('/login')
  }
}
