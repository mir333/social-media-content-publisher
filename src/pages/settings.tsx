import { PlatformCard } from '@/components/platform-card'
import { ProfileManager } from '@/components/profile-manager'
import { useApp } from '@/context'
import type { PlatformType } from '@/types'

const PLATFORM_ORDER: PlatformType[] = ['linkedin', 'x', 'facebook', 'instagram', 'tiktok']

export function SettingsPage() {
  const {
    profiles,
    activeProfile,
    createProfile,
    deleteProfile,
    switchProfile,
    settings,
    updatePlatformCredentials,
    disconnectPlatform,
  } = useApp()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Settings</h2>
        <p className="text-muted-foreground">
          Manage your profiles and platform connections.
        </p>
      </div>

      <ProfileManager
        profiles={profiles}
        activeProfile={activeProfile}
        onCreateProfile={createProfile}
        onDeleteProfile={deleteProfile}
        onSwitchProfile={switchProfile}
      />

      {activeProfile && (
        <>
          <div>
            <h3 className="text-lg font-semibold mb-1">
              Platforms for &ldquo;{activeProfile.name}&rdquo;
            </h3>
            <p className="text-sm text-muted-foreground">
              Connect your social media accounts to publish posts.
            </p>
          </div>

          {PLATFORM_ORDER.map((platform) => (
            <PlatformCard
              key={platform}
              platform={platform}
              credentials={settings.platformCredentials[platform]}
              connection={activeProfile.connections[platform]}
              onSaveCredentials={(creds) =>
                updatePlatformCredentials(platform, creds)
              }
              onDisconnect={() => disconnectPlatform(platform)}
            />
          ))}
        </>
      )}
    </div>
  )
}
