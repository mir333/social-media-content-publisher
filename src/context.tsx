/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'
import type { Profile, AppSettings, PlatformCredentials, PlatformType } from '@/types'

export interface AppContextValue {
  profiles: Profile[]
  activeProfile: Profile | null
  createProfile: (name: string) => Profile
  deleteProfile: (id: string) => void
  switchProfile: (id: string) => void
  updateProfile: (id: string, updates: Partial<Profile>) => void
  refreshProfiles: () => void
  settings: AppSettings
  updatePlatformCredentials: (platform: PlatformType, credentials: PlatformCredentials) => void
  disconnectPlatform: (platform: PlatformType) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export const AppProvider = AppContext.Provider

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
