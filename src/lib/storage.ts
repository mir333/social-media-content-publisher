import { STORAGE_KEYS } from './constants'
import type { Profile, AppSettings } from '@/types'

export function getProfiles(): Profile[] {
  const data = localStorage.getItem(STORAGE_KEYS.PROFILES)
  return data ? JSON.parse(data) : []
}

export function saveProfiles(profiles: Profile[]) {
  localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles))
}

export function getActiveProfileId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE_ID)
}

export function setActiveProfileId(id: string | null) {
  if (id) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, id)
  } else {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROFILE_ID)
  }
}

export function getSettings(): AppSettings {
  const data = localStorage.getItem(STORAGE_KEYS.SETTINGS)
  return data ? JSON.parse(data) : { platformCredentials: {} }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
}

export function getOAuthState(): string | null {
  return sessionStorage.getItem(STORAGE_KEYS.OAUTH_STATE)
}

export function setOAuthState(state: string | null) {
  if (state) {
    sessionStorage.setItem(STORAGE_KEYS.OAUTH_STATE, state)
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.OAUTH_STATE)
  }
}

export function getPkceVerifier(): string | null {
  return sessionStorage.getItem(STORAGE_KEYS.PKCE_VERIFIER)
}

export function setPkceVerifier(verifier: string | null) {
  if (verifier) {
    sessionStorage.setItem(STORAGE_KEYS.PKCE_VERIFIER, verifier)
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.PKCE_VERIFIER)
  }
}
