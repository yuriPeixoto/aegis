import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/axios'

export interface ChangelogEntry {
  version: string
  date: string
  highlights: string[]
}

export interface AboutInfo {
  version: string
  build_date: string
  env: string
  github_url: string
  changelog: ChangelogEntry[]
}

export function useAbout() {
  return useQuery<AboutInfo>({
    queryKey: ['about'],
    queryFn: () => api.get<AboutInfo>('/about').then((r) => r.data),
    staleTime: Infinity,
  })
}
