import { useState, useCallback } from 'react'
import type { AppSettings, PlatformCredentials, PlatformType } from '@/types'
import { getSettings, saveSettings } from '@/lib/storage'

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(getSettings)

  const updatePlatformCredentials = useCallback(
    (platform: PlatformType, credentials: PlatformCredentials) => {
      const current = getSettings()
      const updated: AppSettings = {
        ...current,
        platformCredentials: {
          ...current.platformCredentials,
          [platform]: credentials,
        },
      }
      saveSettings(updated)
      setSettingsState(updated)
    },
    [],
  )

  return {
    settings,
    updatePlatformCredentials,
  }
}
