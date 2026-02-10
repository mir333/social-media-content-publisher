import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ClipboardPaste, ImagePlus, Loader2, Send, Settings, Type, Video, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile, PlatformType, MediaMode } from '@/types'
import { PLATFORMS, publishPost } from '@/lib/platforms'
import {
  PLATFORM_LIMITS,
  PLATFORM_MEDIA_SUPPORT,
  PLATFORM_IMAGE_CONSTRAINTS,
  PLATFORM_VIDEO_CONSTRAINTS,
} from '@/lib/constants'

function computeMediaErrors(
  platforms: PlatformType[],
  mode: MediaMode,
  file: File | null,
  videoDuration: number | null,
): Map<PlatformType, string[]> {
  const errors = new Map<PlatformType, string[]>()
  if (mode === 'text' || !file) return errors

  for (const platform of platforms) {
    const platformErrors: string[] = []

    if (mode === 'image') {
      const constraints = PLATFORM_IMAGE_CONSTRAINTS[platform]
      if (file.size > constraints.maxSizeMB * 1024 * 1024) {
        platformErrors.push(`File too large (max ${constraints.maxSizeMB}MB)`)
      }
      if (!constraints.formats.includes(file.type)) {
        platformErrors.push('Unsupported format')
      }
    }

    if (mode === 'video') {
      const constraints = PLATFORM_VIDEO_CONSTRAINTS[platform]
      if (file.size > constraints.maxSizeMB * 1024 * 1024) {
        platformErrors.push(`File too large (max ${constraints.maxSizeMB}MB)`)
      }
      if (!constraints.formats.includes(file.type)) {
        platformErrors.push('Unsupported format')
      }
      if (videoDuration != null) {
        const { minDurationSec, maxDurationSec } = constraints
        if (minDurationSec != null && videoDuration < minDurationSec) {
          platformErrors.push(`Duration ${minDurationSec}–${maxDurationSec}s required`)
        } else if (maxDurationSec != null && videoDuration > maxDurationSec) {
          platformErrors.push(`Duration ${minDurationSec ?? 0}–${maxDurationSec}s required`)
        }
      }
    }

    if (platformErrors.length > 0) {
      errors.set(platform, platformErrors)
    }
  }

  return errors
}

export function PostComposer({ profile }: { profile: Profile }) {
  const [content, setContent] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [mediaMode, setMediaMode] = useState<MediaMode>('text')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [enabledPlatforms, setEnabledPlatforms] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const key of Object.keys(profile.connections)) {
      initial[key] = true
    }
    return initial
  })

  const mediaPreviewUrl = useMemo(() => (mediaFile ? URL.createObjectURL(mediaFile) : null), [mediaFile])

  useEffect(() => {
    return () => {
      if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl)
    }
  }, [mediaPreviewUrl])

  const handleMediaModeChange = (value: string) => {
    if (!value) return
    const newMode = value as MediaMode
    setMediaMode(newMode)
    setMediaFile(null)
    setVideoDuration(null)
    // Reset enabled platforms to only those that support the new mode
    const newEnabled: Record<string, boolean> = {}
    for (const key of Object.keys(profile.connections)) {
      newEnabled[key] = PLATFORM_MEDIA_SUPPORT[key as PlatformType].has(newMode)
    }
    setEnabledPlatforms(newEnabled)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setMediaFile(file)
    setVideoDuration(null)
    e.target.value = ''
  }

  const removeMedia = () => {
    setMediaFile(null)
    setVideoDuration(null)
  }

  const handleVideoMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration)
    }
  }

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const connectedPlatforms = Object.keys(profile.connections) as PlatformType[]
  const supportedPlatforms = connectedPlatforms.filter((p) =>
    PLATFORM_MEDIA_SUPPORT[p].has(mediaMode),
  )

  const togglePlatform = (platform: PlatformType) => {
    setEnabledPlatforms((prev) => ({ ...prev, [platform]: !prev[platform] }))
  }

  const activePlatforms = supportedPlatforms.filter((p) => enabledPlatforms[p])
  const hasOverLimit = activePlatforms.some((p) => content.length > PLATFORM_LIMITS[p])
  const needsMedia = mediaMode !== 'text' && !mediaFile

  const mediaErrors = computeMediaErrors(activePlatforms, mediaMode, mediaFile, videoDuration)
  const hasMediaErrors = mediaErrors.size > 0

  const handlePublish = async () => {
    if (activePlatforms.length === 0) {
      toast.error('No platforms selected')
      return
    }
    if (!content.trim() && mediaMode === 'text') {
      toast.error('Post content is empty')
      return
    }

    setPublishing(true)
    const results: { platform: PlatformType; success: boolean; error?: string; postId?: string }[] = []

    let imageDataUrl: string | undefined
    let videoDataUrl: string | undefined
    if (mediaFile && mediaMode === 'image') {
      imageDataUrl = await fileToBase64(mediaFile)
    } else if (mediaFile && mediaMode === 'video') {
      videoDataUrl = await fileToBase64(mediaFile)
    }

    const promises = activePlatforms.map(async (platform) => {
      try {
        const connection = profile.connections[platform]!
        const result = await publishPost(platform, connection.accessToken, content, imageDataUrl, videoDataUrl)
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
      setMediaFile(null)
      setVideoDuration(null)
      setMediaMode('text')
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
          <ToggleGroup
            type="single"
            value={mediaMode}
            onValueChange={handleMediaModeChange}
            className="justify-start"
          >
            <ToggleGroupItem value="text" aria-label="Text only">
              <Type className="h-4 w-4 mr-2" />
              Text
            </ToggleGroupItem>
            <ToggleGroupItem value="image" aria-label="Image and text">
              <ImagePlus className="h-4 w-4 mr-2" />
              Image
            </ToggleGroupItem>
            <ToggleGroupItem value="video" aria-label="Video and text">
              <Video className="h-4 w-4 mr-2" />
              Video
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="relative">
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="resize-none text-base"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-1.5 right-1.5 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText()
                  if (!text) {
                    toast.error('Clipboard is empty')
                    return
                  }
                  setContent((prev) => prev ? `${prev}\n\n${text}` : text)
                  toast.success('Pasted from clipboard')
                } catch {
                  toast.error('Clipboard access denied. Please use Ctrl+V / Cmd+V instead.')
                }
              }}
              title="Paste from clipboard"
            >
              <ClipboardPaste className="h-3.5 w-3.5 mr-1" />
              Paste
            </Button>
          </div>

          {mediaMode !== 'text' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={mediaMode === 'image' ? 'image/*' : 'video/*'}
                className="hidden"
                onChange={handleFileSelect}
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {mediaMode === 'image' ? (
                    <ImagePlus className="h-4 w-4 mr-2" />
                  ) : (
                    <Video className="h-4 w-4 mr-2" />
                  )}
                  {mediaFile
                    ? `Change ${mediaMode}`
                    : `Add ${mediaMode}`}
                </Button>
                {needsMedia && (
                  <span className="text-sm text-destructive">
                    {mediaMode === 'image' ? 'Image' : 'Video'} required for selected platforms
                  </span>
                )}
              </div>
            </>
          )}

          {mediaPreviewUrl && mediaMode === 'image' && (
            <div className="relative inline-block">
              <img
                src={mediaPreviewUrl}
                alt="Upload preview"
                className="h-32 rounded-md border object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={removeMedia}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {mediaPreviewUrl && mediaMode === 'video' && (
            <div className="relative inline-block">
              <video
                ref={videoRef}
                src={mediaPreviewUrl}
                className="h-48 rounded-md border"
                muted
                controls
                onLoadedMetadata={handleVideoMetadata}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={removeMedia}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

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
            {supportedPlatforms.map((platform) => {
              const errors = mediaErrors.get(platform) ?? []
              return (
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
                  <div className="flex items-center gap-2">
                    {!PLATFORM_MEDIA_SUPPORT[platform].has('text') && (
                      <Badge variant="outline" className="text-xs">
                        Requires media
                      </Badge>
                    )}
                    {enabledPlatforms[platform] && content.length > PLATFORM_LIMITS[platform] && (
                      <Badge variant="destructive" className="text-xs">
                        Over limit
                      </Badge>
                    )}
                    {enabledPlatforms[platform] && errors.map((err) => (
                      <Badge key={err} variant="destructive" className="text-xs">
                        {err}
                      </Badge>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handlePublish}
        disabled={publishing || (!content.trim() && mediaMode === 'text') || activePlatforms.length === 0 || hasOverLimit || needsMedia || hasMediaErrors}
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
