import type { PlatformInfo, PlatformType } from '@/types'

export const PLATFORMS: Record<PlatformType, PlatformInfo> = {
  linkedin: {
    type: 'linkedin',
    name: 'LinkedIn',
    color: '#0A66C2',
    maxLength: 3000,
    authUrl: (clientId, redirectUri, state) =>
      `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent('openid profile w_member_social')}`,
  },
  x: {
    type: 'x',
    name: 'X (Twitter)',
    color: '#000000',
    maxLength: 280,
    authUrl: (clientId, redirectUri, state, codeChallenge) =>
      `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent('tweet.read tweet.write users.read offline.access')}&code_challenge=${encodeURIComponent(codeChallenge || '')}&code_challenge_method=S256`,
  },
  facebook: {
    type: 'facebook',
    name: 'Facebook',
    color: '#1877F2',
    maxLength: 63206,
    authUrl: (clientId, redirectUri, state) =>
      `https://www.facebook.com/v21.0/dialog/oauth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent('pages_manage_posts,pages_read_engagement,pages_show_list')}`,
  },
  instagram: {
    type: 'instagram',
    name: 'Instagram',
    color: '#E4405F',
    maxLength: 2200,
    authUrl: (clientId, redirectUri, state) =>
      `https://www.facebook.com/v21.0/dialog/oauth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent('instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement')}`,
  },
  tiktok: {
    type: 'tiktok',
    name: 'TikTok',
    color: '#ff0050',
    maxLength: 2200,
    authUrl: (clientId, redirectUri, state, codeChallenge) =>
      `https://www.tiktok.com/v2/auth/authorize/?client_key=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent('user.info.basic,video.publish')}&code_challenge=${encodeURIComponent(codeChallenge || '')}&code_challenge_method=S256`,
  },
}

/** Platforms that use PKCE for OAuth */
export const PKCE_PLATFORMS: ReadonlySet<PlatformType> = new Set(['x', 'tiktok'])

export function generateState(): string {
  return crypto.randomUUID()
}

export async function generatePKCE() {
  const verifier = generateRandomString(128)
  const challenge = await sha256Base64url(verifier)
  return { verifier, challenge }
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, (v) => chars[v % chars.length]).join('')
}

async function sha256Base64url(plain: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function getRedirectUri(platform: PlatformType): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${window.location.origin}${base}/auth/callback/${platform}`
}

export async function publishPost(
  platform: PlatformType,
  accessToken: string,
  text: string,
  image?: string,
  video?: string,
): Promise<{ id?: string; error?: string }> {
  const body: Record<string, string> = { accessToken, text }
  if (image) {
    body.image = image
  }
  if (video) {
    body.video = video
  }
  const res = await fetch(`/api/post/${platform}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function exchangeToken(
  platform: PlatformType,
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  codeVerifier?: string,
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number; error?: string }> {
  const res = await fetch(`/api/auth/${platform}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, clientId, clientSecret, redirectUri, codeVerifier }),
  })
  return res.json()
}

export async function fetchUserProfile(
  platform: PlatformType,
  accessToken: string,
): Promise<{ userId: string; displayName: string; profileUrl?: string; error?: string }> {
  const res = await fetch(`/api/user/${platform}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken }),
  })
  return res.json()
}
