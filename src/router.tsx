/* eslint-disable react-refresh/only-export-components */
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { AppHeader } from '@/components/app-header'
import { ComposePage } from '@/pages/compose'
import { SettingsPage } from '@/pages/settings'
import { AuthCallbackPage } from '@/pages/auth-callback'
import { useProfiles } from '@/hooks/use-profiles'
import { useSettings } from '@/hooks/use-settings'
import { AppProvider, type AppContextValue } from '@/context'
import type { PlatformType } from '@/types'

function RootLayout() {
  const profilesHook = useProfiles()
  const settingsHook = useSettings()

  const disconnectPlatform = (platform: PlatformType) => {
    const profile = profilesHook.activeProfile
    if (!profile) return
    const updatedConnections = { ...profile.connections }
    delete updatedConnections[platform]
    profilesHook.updateProfile(profile.id, { connections: updatedConnections })
  }

  const contextValue: AppContextValue = {
    profiles: profilesHook.profiles,
    activeProfile: profilesHook.activeProfile,
    createProfile: profilesHook.createProfile,
    deleteProfile: profilesHook.deleteProfile,
    switchProfile: profilesHook.switchProfile,
    updateProfile: profilesHook.updateProfile,
    refreshProfiles: profilesHook.refreshProfiles,
    settings: settingsHook.settings,
    updatePlatformCredentials: settingsHook.updatePlatformCredentials,
    disconnectPlatform,
  }

  return (
    <AppProvider value={contextValue}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-screen bg-background text-foreground">
          <AppHeader
            profiles={profilesHook.profiles}
            activeProfile={profilesHook.activeProfile}
            onSwitchProfile={profilesHook.switchProfile}
          />
          <main className="container mx-auto px-4 py-8">
            <Outlet />
          </main>
        </div>
        <Toaster richColors />
      </ThemeProvider>
    </AppProvider>
  )
}

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: ComposePage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
})

const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback/$platform',
  component: function AuthCallbackWrapper() {
    const { platform } = authCallbackRoute.useParams()
    return <AuthCallbackPage platform={platform as PlatformType} />
  },
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  settingsRoute,
  authCallbackRoute,
])

export const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
