import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { PlatformType, Profile } from '@/types'
import {
  getOAuthState,
  setOAuthState,
  getPkceVerifier,
  setPkceVerifier,
  getSettings,
  getProfiles,
  saveProfiles,
  getActiveProfileId,
} from '@/lib/storage'
import { exchangeToken, fetchUserProfile, getRedirectUri, PLATFORMS } from '@/lib/platforms'

export function AuthCallbackPage({ platform }: { platform: PlatformType }) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    handleCallback()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCallback() {
    try {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const state = params.get('state')
      const errorParam = params.get('error')

      if (errorParam) {
        throw new Error(
          `OAuth error: ${errorParam} - ${params.get('error_description') ?? ''}`,
        )
      }

      if (!code || !state) {
        throw new Error('Missing authorization code or state parameter.')
      }

      const storedStateData = getOAuthState()
      if (!storedStateData) {
        throw new Error('No OAuth state found. Please try connecting again from Settings.')
      }

      const { state: storedState, platform: storedPlatform } = JSON.parse(storedStateData)
      if (state !== storedState || platform !== storedPlatform) {
        throw new Error('State mismatch. Possible CSRF attack. Please try again.')
      }
      setOAuthState(null)

      const settings = getSettings()
      const creds = settings.platformCredentials[platform]
      if (!creds) {
        throw new Error('Platform credentials not found. Please configure them in Settings.')
      }

      const redirectUri = getRedirectUri(platform)
      const codeVerifier = platform === 'x' ? (getPkceVerifier() ?? undefined) : undefined
      setPkceVerifier(null)

      const tokenResult = await exchangeToken(
        platform,
        code,
        creds.clientId,
        creds.clientSecret,
        redirectUri,
        codeVerifier,
      )

      if (tokenResult.error) {
        throw new Error(tokenResult.error)
      }

      const userProfile = await fetchUserProfile(platform, tokenResult.accessToken)
      if (userProfile.error) {
        throw new Error(userProfile.error)
      }

      const activeProfileId = getActiveProfileId()
      if (!activeProfileId) {
        throw new Error('No active profile. Please create one in Settings first.')
      }

      const profiles = getProfiles()
      const updatedProfiles = profiles.map((p: Profile) => {
        if (p.id === activeProfileId) {
          return {
            ...p,
            connections: {
              ...p.connections,
              [platform]: {
                accessToken: tokenResult.accessToken,
                refreshToken: tokenResult.refreshToken,
                expiresAt: tokenResult.expiresIn
                  ? Date.now() + tokenResult.expiresIn * 1000
                  : undefined,
                userId: userProfile.userId,
                displayName: userProfile.displayName,
                profileUrl: userProfile.profileUrl,
              },
            },
          }
        }
        return p
      })
      saveProfiles(updatedProfiles)

      setStatus('success')
      setTimeout(() => {
        window.location.href = '/settings'
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setStatus('error')
    }
  }

  const platformName = PLATFORMS[platform]?.name ?? platform

  return (
    <div className="flex items-center justify-center py-20">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <p className="text-lg font-medium">Connecting to {platformName}...</p>
              <p className="text-sm text-muted-foreground">
                Completing authentication, please wait.
              </p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
              <p className="text-lg font-medium">Connected to {platformName}!</p>
              <p className="text-sm text-muted-foreground">
                Redirecting to settings...
              </p>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 mx-auto text-destructive" />
              <p className="text-lg font-medium">Connection Failed</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => (window.location.href = '/settings')}>
                Back to Settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
