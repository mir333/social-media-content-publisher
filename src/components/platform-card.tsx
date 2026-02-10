import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Music2,
  ExternalLink,
  Unlink,
  Loader2,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react'
import type { PlatformType, PlatformCredentials, Connection } from '@/types'
import {
  PLATFORMS,
  PKCE_PLATFORMS,
  generateState,
  generatePKCE,
  getRedirectUri,
} from '@/lib/platforms'
import { setOAuthState, setPkceVerifier } from '@/lib/storage'

const PLATFORM_ICONS: Record<PlatformType, typeof Linkedin> = {
  linkedin: Linkedin,
  x: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  tiktok: Music2,
}

export function PlatformCard({
  platform,
  credentials,
  connection,
  onSaveCredentials,
  onDisconnect,
}: {
  platform: PlatformType
  credentials?: PlatformCredentials
  connection?: Connection
  onSaveCredentials: (credentials: PlatformCredentials) => void
  onDisconnect: () => void
}) {
  const info = PLATFORMS[platform]
  const Icon = PLATFORM_ICONS[platform]
  const [clientId, setClientId] = useState(credentials?.clientId ?? '')
  const [clientSecret, setClientSecret] = useState(credentials?.clientSecret ?? '')
  const [connecting, setConnecting] = useState(false)
  const [copied, setCopied] = useState(false)
  const redirectUri = getRedirectUri(platform)

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveAndConnect = async () => {
    if (!clientId || !clientSecret) return
    onSaveCredentials({ clientId, clientSecret })
    setConnecting(true)

    const state = generateState()
    setOAuthState(JSON.stringify({ state, platform }))

    const redirectUri = getRedirectUri(platform)

    if (PKCE_PLATFORMS.has(platform)) {
      const { verifier, challenge } = await generatePKCE()
      setPkceVerifier(verifier)
      window.location.href = info.authUrl(clientId, redirectUri, state, challenge)
    } else {
      window.location.href = info.authUrl(clientId, redirectUri, state)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: info.color + '15', color: info.color }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{info.name}</CardTitle>
              <CardDescription>
                {connection
                  ? `Connected as ${connection.displayName}`
                  : 'Not connected'}
              </CardDescription>
            </div>
          </div>
          <Badge variant={connection ? 'default' : 'secondary'}>
            {connection ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection ? (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Logged in as <strong>{connection.displayName}</strong>
              {connection.profileUrl && (
                <a
                  href={connection.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center text-primary hover:underline"
                >
                  View profile <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={onDisconnect}>
              <Unlink className="h-4 w-4 mr-1.5" />
              Disconnect
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor={`${platform}-client-id`}>
                {platform === 'tiktok' ? 'Client Key' : 'Client ID'}
              </Label>
              <Input
                id={`${platform}-client-id`}
                placeholder={`Enter your app's ${platform === 'tiktok' ? 'Client Key' : 'Client ID'}`}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${platform}-client-secret`}>Client Secret</Label>
              <Input
                id={`${platform}-client-secret`}
                type="password"
                placeholder="Enter your app's Client Secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <SetupGuideDialog
                platform={platform}
                redirectUri={redirectUri}
                copied={copied}
                onCopy={copyRedirectUri}
              />
            </div>
            <Button
              onClick={handleSaveAndConnect}
              disabled={!clientId || !clientSecret || connecting}
              className="w-full"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Icon className="h-4 w-4 mr-2" />
              )}
              Connect with {info.name}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// --- Copyable redirect URI block ---

function CopyableUrl({
  url,
  copied,
  onCopy,
}: {
  url: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
      <code className="flex-1 text-xs break-all select-all">{url}</code>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onCopy}>
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  )
}

// --- Step component ---

function Step({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
        {number}
      </div>
      <div className="space-y-1.5 pt-0.5">
        <p className="text-sm font-medium leading-none">{title}</p>
        <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

// --- Guide props type ---

type GuideProps = { redirectUri: string; copied: boolean; onCopy: () => void }

// --- Setup guide dialog ---

const GUIDE_COMPONENTS: Record<PlatformType, React.FC<GuideProps>> = {
  linkedin: LinkedInGuide,
  x: XGuide,
  facebook: FacebookGuide,
  instagram: InstagramGuide,
  tiktok: TikTokGuide,
}

function SetupGuideDialog({
  platform,
  redirectUri,
  copied,
  onCopy,
}: {
  platform: PlatformType
  redirectUri: string
  copied: boolean
  onCopy: () => void
}) {
  const Guide = GUIDE_COMPONENTS[platform]
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs gap-1.5">
          <HelpCircle className="h-3.5 w-3.5" />
          How do I get these credentials?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <Guide redirectUri={redirectUri} copied={copied} onCopy={onCopy} />
      </DialogContent>
    </Dialog>
  )
}

// --- LinkedIn Guide ---

function LinkedInGuide({ redirectUri, copied, onCopy }: GuideProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Linkedin className="h-5 w-5" />
          Setting up LinkedIn
        </DialogTitle>
        <DialogDescription>
          Follow these steps to create a LinkedIn developer app and get your
          Client ID and Client Secret.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 pt-2">
        <Step number={1} title="Create a LinkedIn App">
          <p>
            Go to the{' '}
            <a
              href="https://www.linkedin.com/developers/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              LinkedIn Developer Portal <ExternalLink className="h-3 w-3" />
            </a>{' '}
            and click <strong>Create app</strong>.
          </p>
          <p>
            Fill in the required fields: app name (e.g. &ldquo;Social
            Publisher&rdquo;), your LinkedIn page (you can create a new one if
            needed), a privacy policy URL (can use a placeholder during
            development), and upload a logo.
          </p>
        </Step>

        <Separator />

        <Step number={2} title="Enable Required Products">
          <p>
            In your app&apos;s dashboard, go to the <strong>Products</strong>{' '}
            tab and request access to:
          </p>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>
              <strong>Share on LinkedIn</strong> &mdash; allows posting content
              on behalf of the user
            </li>
            <li>
              <strong>Sign In with LinkedIn using OpenID Connect</strong> &mdash;
              enables the OAuth login flow
            </li>
          </ul>
          <p className="mt-1">
            Some products are approved instantly. Others may take a few minutes.
            Wait until the status shows <strong>Added</strong> before
            continuing.
          </p>
        </Step>

        <Separator />

        <Step number={3} title="Configure the Redirect URL">
          <p>
            Go to the <strong>Auth</strong> tab. Under{' '}
            <strong>OAuth 2.0 settings</strong>, add the following as an
            authorized redirect URL:
          </p>
          <CopyableUrl url={redirectUri} copied={copied} onCopy={onCopy} />
        </Step>

        <Separator />

        <Step number={4} title="Copy Your Credentials">
          <p>
            Still on the <strong>Auth</strong> tab, you will see your{' '}
            <strong>Client ID</strong> and <strong>Client Secret</strong>. Copy
            both values and paste them into the fields on this page.
          </p>
          <p>
            The Client Secret is hidden by default &mdash; click the eye icon to
            reveal it, then copy.
          </p>
        </Step>

        <Separator />

        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Important notes</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              Your LinkedIn app must be associated with a LinkedIn Page. If you
              don&apos;t have one, create a simple page first.
            </li>
            <li>
              During development, the app works for the admin account
              immediately. To allow other users, you would need to submit for
              verification.
            </li>
            <li>Access tokens are valid for 60 days.</li>
          </ul>
        </div>
      </div>
    </>
  )
}

// --- X Guide ---

function XGuide({ redirectUri, copied, onCopy }: GuideProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Twitter className="h-5 w-5" />
          Setting up X (Twitter)
        </DialogTitle>
        <DialogDescription>
          Follow these steps to create an X developer app and get your Client ID
          and Client Secret.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 pt-2">
        <Step number={1} title="Sign Up for Developer Access">
          <p>
            Go to the{' '}
            <a
              href="https://developer.x.com/en/portal/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              X Developer Portal <ExternalLink className="h-3 w-3" />
            </a>{' '}
            and sign in with your X account.
          </p>
          <p>
            If you don&apos;t have developer access yet, sign up for the{' '}
            <strong>Free</strong> tier. You&apos;ll need to describe your use
            case (e.g. &ldquo;Personal tool to publish tweets from a custom
            app&rdquo;).
          </p>
        </Step>

        <Separator />

        <Step number={2} title="Create a Project and App">
          <p>
            In the Developer Portal, create a <strong>Project</strong> (e.g.
            &ldquo;Social Publisher&rdquo;), then create an <strong>App</strong>{' '}
            inside it. Choose the appropriate environment
            (Development/Production).
          </p>
        </Step>

        <Separator />

        <Step number={3} title="Set Up OAuth 2.0">
          <p>
            In your app&apos;s settings, scroll to{' '}
            <strong>User authentication settings</strong> and click{' '}
            <strong>Set up</strong>. Configure as follows:
          </p>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>
              <strong>App permissions</strong>: select{' '}
              <strong>Read and write</strong>
            </li>
            <li>
              <strong>Type of App</strong>: select <strong>Web App, Automated App or Bot</strong>
            </li>
            <li>
              <strong>Callback URI</strong>: add the URL below
            </li>
            <li>
              <strong>Website URL</strong>: can be any valid URL (e.g.{' '}
              <code className="text-xs">http://localhost:5173</code>)
            </li>
          </ul>
          <div className="mt-2">
            <CopyableUrl url={redirectUri} copied={copied} onCopy={onCopy} />
          </div>
        </Step>

        <Separator />

        <Step number={4} title="Copy Your Credentials">
          <p>
            After saving, go to the <strong>Keys and tokens</strong> tab. Under{' '}
            <strong>OAuth 2.0 Client ID and Client Secret</strong>, you will
            find both values.
          </p>
          <p>
            If you don&apos;t see a Client Secret, click{' '}
            <strong>Regenerate</strong> to create one. Copy both the Client ID
            and Client Secret and paste them into the fields on this page.
          </p>
        </Step>

        <Separator />

        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Important notes</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              The Free tier allows 1,500 tweets per month. This is enough
              for personal use.
            </li>
            <li>
              Make sure your app permissions are set to <strong>Read and
              write</strong>. Read-only access cannot post tweets.
            </li>
            <li>
              Access tokens expire after 2 hours. If posting fails, try
              reconnecting from this page.
            </li>
          </ul>
        </div>
      </div>
    </>
  )
}

// --- Facebook Guide ---

function FacebookGuide({ redirectUri, copied, onCopy }: GuideProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Facebook className="h-5 w-5" />
          Setting up Facebook
        </DialogTitle>
        <DialogDescription>
          Follow these steps to create a Facebook app and get your App ID and
          App Secret. Posts are published to your Facebook Page.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 pt-2">
        <Step number={1} title="Create a Facebook App">
          <p>
            Go to{' '}
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              Meta for Developers <ExternalLink className="h-3 w-3" />
            </a>{' '}
            and click <strong>Create App</strong>.
          </p>
          <p>
            Select <strong>Other</strong> as the use case, then choose{' '}
            <strong>Business</strong> as the app type. Give it a name (e.g.
            &ldquo;Social Publisher&rdquo;).
          </p>
        </Step>

        <Separator />

        <Step number={2} title="Add Facebook Login Product">
          <p>
            In your app&apos;s dashboard, click <strong>Add Product</strong> and
            find <strong>Facebook Login</strong>. Click <strong>Set Up</strong> and
            choose <strong>Web</strong>.
          </p>
          <p>
            Under <strong>Facebook Login &gt; Settings</strong>, add the
            following as a valid OAuth redirect URI:
          </p>
          <CopyableUrl url={redirectUri} copied={copied} onCopy={onCopy} />
        </Step>

        <Separator />

        <Step number={3} title="Configure Permissions">
          <p>
            Go to <strong>App Review &gt; Permissions and Features</strong> and
            request these permissions:
          </p>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>
              <strong>pages_manage_posts</strong> &mdash; allows publishing to
              your Pages
            </li>
            <li>
              <strong>pages_read_engagement</strong> &mdash; allows reading Page
              info
            </li>
            <li>
              <strong>pages_show_list</strong> &mdash; allows listing your Pages
            </li>
          </ul>
          <p className="mt-1">
            While in development mode, these work for your own account without
            review. For other users, submit for App Review.
          </p>
        </Step>

        <Separator />

        <Step number={4} title="Copy Your Credentials">
          <p>
            Go to <strong>Settings &gt; Basic</strong>. Copy the{' '}
            <strong>App ID</strong> (this is the Client ID) and{' '}
            <strong>App Secret</strong> (this is the Client Secret) and paste
            them into the fields on this page.
          </p>
        </Step>

        <Separator />

        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Important notes</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              Facebook API posts are published to a <strong>Page</strong> you
              manage, not your personal profile. Make sure you have at least one
              Facebook Page.
            </li>
            <li>
              In development mode, only app administrators and testers can use
              the app.
            </li>
            <li>
              Page access tokens do not expire once exchanged for a long-lived
              token.
            </li>
          </ul>
        </div>
      </div>
    </>
  )
}

// --- Instagram Guide ---

function InstagramGuide({ redirectUri, copied, onCopy }: GuideProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Instagram className="h-5 w-5" />
          Setting up Instagram
        </DialogTitle>
        <DialogDescription>
          Instagram uses the Facebook developer platform. You need a Facebook
          App and an Instagram Business or Creator account.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 pt-2">
        <Step number={1} title="Prerequisites">
          <ul className="list-disc pl-4 space-y-1">
            <li>
              An <strong>Instagram Business</strong> or{' '}
              <strong>Creator</strong> account (switch in Instagram app under
              Settings &gt; Account type).
            </li>
            <li>
              A <strong>Facebook Page</strong> linked to your Instagram account
              (link it in Instagram &gt; Settings &gt; Linked accounts).
            </li>
          </ul>
        </Step>

        <Separator />

        <Step number={2} title="Create a Facebook App">
          <p>
            Go to{' '}
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              Meta for Developers <ExternalLink className="h-3 w-3" />
            </a>{' '}
            and create a <strong>Business</strong> app (or reuse your Facebook
            app if you already have one).
          </p>
        </Step>

        <Separator />

        <Step number={3} title="Add Instagram Products">
          <p>
            In your app dashboard, add the{' '}
            <strong>Instagram Graph API</strong> product. Then go to{' '}
            <strong>Facebook Login &gt; Settings</strong> and add this redirect
            URI:
          </p>
          <CopyableUrl url={redirectUri} copied={copied} onCopy={onCopy} />
          <p className="mt-2">
            Request these permissions under{' '}
            <strong>App Review &gt; Permissions</strong>:
          </p>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>
              <strong>instagram_basic</strong> &mdash; read account info
            </li>
            <li>
              <strong>instagram_content_publish</strong> &mdash; publish media
            </li>
            <li>
              <strong>pages_show_list</strong> and{' '}
              <strong>pages_read_engagement</strong>
            </li>
          </ul>
        </Step>

        <Separator />

        <Step number={4} title="Copy Your Credentials">
          <p>
            Go to <strong>Settings &gt; Basic</strong>. The{' '}
            <strong>App ID</strong> is the Client ID and the{' '}
            <strong>App Secret</strong> is the Client Secret.
          </p>
        </Step>

        <Separator />

        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Important notes</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              Instagram API <strong>requires media</strong> (photo or video) for
              every post. Text-only posts are not supported. Media upload
              support is coming soon.
            </li>
            <li>
              Only Business and Creator accounts can publish via the API.
              Personal accounts are not supported.
            </li>
            <li>
              Instagram and Facebook share the same developer app &mdash; you
              can use the same App ID for both.
            </li>
          </ul>
        </div>
      </div>
    </>
  )
}

// --- TikTok Guide ---

function TikTokGuide({ redirectUri, copied, onCopy }: GuideProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Music2 className="h-5 w-5" />
          Setting up TikTok
        </DialogTitle>
        <DialogDescription>
          Follow these steps to create a TikTok developer app and get your
          Client Key and Client Secret.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 pt-2">
        <Step number={1} title="Register as a Developer">
          <p>
            Go to the{' '}
            <a
              href="https://developers.tiktok.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              TikTok for Developers <ExternalLink className="h-3 w-3" />
            </a>{' '}
            and sign in with your TikTok account. Complete the developer
            registration if prompted.
          </p>
        </Step>

        <Separator />

        <Step number={2} title="Create an App">
          <p>
            In the developer portal, go to <strong>Manage apps</strong> and
            click <strong>Create app</strong>. Fill in the app name, description,
            and select the appropriate category.
          </p>
        </Step>

        <Separator />

        <Step number={3} title="Configure Login Kit &amp; Permissions">
          <p>
            In your app settings, enable <strong>Login Kit</strong> and{' '}
            <strong>Content Posting API</strong>. Under Login Kit configuration:
          </p>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>
              Set <strong>Redirect URI</strong> to the URL below
            </li>
            <li>
              Enable scopes: <strong>user.info.basic</strong> and{' '}
              <strong>video.publish</strong>
            </li>
          </ul>
          <div className="mt-2">
            <CopyableUrl url={redirectUri} copied={copied} onCopy={onCopy} />
          </div>
        </Step>

        <Separator />

        <Step number={4} title="Copy Your Credentials">
          <p>
            In your app&apos;s settings page, find the{' '}
            <strong>Client Key</strong> and <strong>Client Secret</strong>. Copy
            both and paste them into the fields on this page.
          </p>
        </Step>

        <Separator />

        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Important notes</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              TikTok&apos;s Content Posting API <strong>requires video or
              photo</strong> content. Text-only posts are not supported. Media
              upload support is coming soon.
            </li>
            <li>
              Your app needs to be approved by TikTok before it can be used by
              other users. In sandbox mode, only the developer account works.
            </li>
            <li>
              Access tokens expire after 24 hours. Refresh tokens last 365 days.
            </li>
          </ul>
        </div>
      </div>
    </>
  )
}
