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
  facebook: 63206,
  instagram: 2200,
  tiktok: 2200,
}

/** Platforms that require media (photo/video) and cannot do text-only posts */
export const MEDIA_ONLY_PLATFORMS: ReadonlySet<string> = new Set(['instagram', 'tiktok'])
