import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Loader2, Send, Settings } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile, PlatformType, PostResult } from '@/types'
import { PLATFORMS, publishPost } from '@/lib/platforms'
import { PLATFORM_LIMITS } from '@/lib/constants'

export function PostComposer({ profile }: { profile: Profile }) {
  const [content, setContent] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [enabledPlatforms, setEnabledPlatforms] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const key of Object.keys(profile.connections)) {
      initial[key] = true
    }
    return initial
  })

  const connectedPlatforms = Object.keys(profile.connections) as PlatformType[]

  const togglePlatform = (platform: PlatformType) => {
    setEnabledPlatforms((prev) => ({ ...prev, [platform]: !prev[platform] }))
  }

  const activePlatforms = connectedPlatforms.filter((p) => enabledPlatforms[p])
  const hasOverLimit = activePlatforms.some((p) => content.length > PLATFORM_LIMITS[p])

  const handlePublish = async () => {
    if (activePlatforms.length === 0) {
      toast.error('No platforms selected')
      return
    }
    if (!content.trim()) {
      toast.error('Post content is empty')
      return
    }

    setPublishing(true)
    const results: PostResult[] = []

    const promises = activePlatforms.map(async (platform) => {
      try {
        const connection = profile.connections[platform]!
        const result = await publishPost(platform, connection.accessToken, content)
        if (result.error) {
          results.push({ platform, success: false, error: result.error })
        } else {
          results.push({ platform, success: true, postId: result.id })
        }
      } catch (err) {
        results.push({ platform, success: false, error: String(err) })
      }
    })

    await Promise.allSettled(promises)

    for (const result of results) {
      if (result.success) {
        toast.success(`Published to ${PLATFORMS[result.platform].name}`)
      } else {
        toast.error(`${PLATFORMS[result.platform].name}: ${result.error}`)
      }
    }

    if (results.length > 0 && results.every((r) => r.success)) {
      setContent('')
    }

    setPublishing(false)
  }

  if (connectedPlatforms.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground mb-4">
            No platforms connected yet. Connect your accounts in Settings to start publishing.
          </p>
          <Button asChild>
            <Link to="/settings">
              <Settings className="h-4 w-4 mr-2" />
              Go to Settings
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Compose Post</CardTitle>
          <CardDescription>
            Write once, publish everywhere. Your post will be sent to all selected platforms.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="resize-none text-base"
          />

          <div className="flex flex-wrap gap-2">
            {activePlatforms.map((platform) => {
              const limit = PLATFORM_LIMITS[platform]
              const remaining = limit - content.length
              const isOver = remaining < 0
              return (
                <Badge
                  key={platform}
                  variant={isOver ? 'destructive' : remaining < 50 ? 'secondary' : 'outline'}
                >
                  {PLATFORMS[platform].name}: {content.length}/{limit}
                </Badge>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platforms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {connectedPlatforms.map((platform) => (
              <div key={platform} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={!!enabledPlatforms[platform]}
                    onCheckedChange={() => togglePlatform(platform)}
                  />
                  <Label className="cursor-pointer" onClick={() => togglePlatform(platform)}>
                    {PLATFORMS[platform].name}
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    ({profile.connections[platform]?.displayName})
                  </span>
                </div>
                {enabledPlatforms[platform] && content.length > PLATFORM_LIMITS[platform] && (
                  <Badge variant="destructive" className="text-xs">
                    Over limit
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handlePublish}
        disabled={publishing || !content.trim() || activePlatforms.length === 0 || hasOverLimit}
        size="lg"
        className="w-full"
      >
        {publishing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Publishing...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Publish to {activePlatforms.length} platform{activePlatforms.length !== 1 ? 's' : ''}
          </>
        )}
      </Button>
    </div>
  )
}
