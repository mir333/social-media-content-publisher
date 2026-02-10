import { useState, useCallback } from 'react'
import type { Profile } from '@/types'
import {
  getProfiles,
  saveProfiles,
  getActiveProfileId,
  setActiveProfileId,
} from '@/lib/storage'

export function useProfiles() {
  const [profiles, setProfilesState] = useState<Profile[]>(getProfiles)
  const [activeId, setActiveIdState] = useState<string | null>(getActiveProfileId)

  const activeProfile = profiles.find((p) => p.id === activeId) ?? profiles[0] ?? null

  const createProfile = useCallback((name: string) => {
    const newProfile: Profile = {
      id: crypto.randomUUID(),
      name,
      connections: {},
      createdAt: Date.now(),
    }
    const updated = [...getProfiles(), newProfile]
    saveProfiles(updated)
    setProfilesState(updated)
    setActiveProfileId(newProfile.id)
    setActiveIdState(newProfile.id)
    return newProfile
  }, [])

  const deleteProfile = useCallback(
    (id: string) => {
      const updated = getProfiles().filter((p) => p.id !== id)
      saveProfiles(updated)
      setProfilesState(updated)
      if (activeId === id) {
        const newActiveId = updated[0]?.id ?? null
        setActiveProfileId(newActiveId)
        setActiveIdState(newActiveId)
      }
    },
    [activeId],
  )

  const switchProfile = useCallback((id: string) => {
    setActiveProfileId(id)
    setActiveIdState(id)
  }, [])

  const updateProfile = useCallback((id: string, updates: Partial<Profile>) => {
    const current = getProfiles()
    const updated = current.map((p) => (p.id === id ? { ...p, ...updates } : p))
    saveProfiles(updated)
    setProfilesState(updated)
  }, [])

  const refreshProfiles = useCallback(() => {
    setProfilesState(getProfiles())
    setActiveIdState(getActiveProfileId())
  }, [])

  return {
    profiles,
    activeProfile,
    createProfile,
    deleteProfile,
    switchProfile,
    updateProfile,
    refreshProfiles,
  }
}
