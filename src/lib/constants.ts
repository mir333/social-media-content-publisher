export const STORAGE_KEYS = {
  PROFILES: 'smp:profiles',
  ACTIVE_PROFILE_ID: 'smp:activeProfileId',
  SETTINGS: 'smp:settings',
  OAUTH_STATE: 'smp:oauthState',
  PKCE_VERIFIER: 'smp:pkceVerifier',
} as const

export const PLATFORM_LIMITS: Record<string, number> = {
  linkedin: 3000,
  x: 280,
}
