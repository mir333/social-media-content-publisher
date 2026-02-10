export type PlatformType = 'linkedin' | 'x' | 'facebook' | 'instagram' | 'tiktok'

export interface Connection {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  userId: string
  displayName: string
  profileUrl?: string
}

export interface Profile {
  id: string
  name: string
  connections: Partial<Record<PlatformType, Connection>>
  createdAt: number
}

export interface PlatformCredentials {
  clientId: string
  clientSecret: string
}

export interface AppSettings {
  platformCredentials: Partial<Record<PlatformType, PlatformCredentials>>
}

export interface PostResult {
  platform: PlatformType
  success: boolean
  error?: string
  postId?: string
}

export interface PlatformInfo {
  type: PlatformType
  name: string
  color: string
  maxLength: number
  authUrl: (clientId: string, redirectUri: string, state: string, codeChallenge?: string) => string
}
