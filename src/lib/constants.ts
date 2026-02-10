import type { MediaMode, PlatformType } from '@/types'

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

/** Which media modes each platform supports */
export const PLATFORM_MEDIA_SUPPORT: Record<PlatformType, ReadonlySet<MediaMode>> = {
  linkedin: new Set(['text', 'image', 'video']),
  x: new Set(['text', 'image', 'video']),
  facebook: new Set(['text', 'image', 'video']),
  instagram: new Set(['image', 'video']),
  tiktok: new Set(['image', 'video']),
}

export interface ImageConstraints {
  maxSizeMB: number
  formats: string[]
}

export interface VideoConstraints {
  maxSizeMB: number
  formats: string[]
  minDurationSec?: number
  maxDurationSec?: number
}

export const PLATFORM_IMAGE_CONSTRAINTS: Record<PlatformType, ImageConstraints> = {
  linkedin: { maxSizeMB: 5, formats: ['image/jpeg', 'image/png', 'image/gif'] },
  x: { maxSizeMB: 5, formats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] },
  facebook: { maxSizeMB: 10, formats: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp'] },
  instagram: { maxSizeMB: 8, formats: ['image/jpeg', 'image/png'] },
  tiktok: { maxSizeMB: 20, formats: ['image/jpeg', 'image/png', 'image/webp'] },
}

export const PLATFORM_VIDEO_CONSTRAINTS: Record<PlatformType, VideoConstraints> = {
  linkedin: { maxSizeMB: 100, formats: ['video/mp4'], minDurationSec: 3, maxDurationSec: 900 },
  x: { maxSizeMB: 100, formats: ['video/mp4'], maxDurationSec: 140 },
  facebook: { maxSizeMB: 100, formats: ['video/mp4', 'video/quicktime', 'video/webm'], maxDurationSec: 14400 },
  instagram: { maxSizeMB: 100, formats: ['video/mp4'], minDurationSec: 3, maxDurationSec: 90 },
  tiktok: { maxSizeMB: 50, formats: ['video/mp4', 'video/webm'], minDurationSec: 3, maxDurationSec: 60 },
}
