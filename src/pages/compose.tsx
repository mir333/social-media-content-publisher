import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Settings, Sparkles, ExternalLink, X, Copy, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PostComposer } from '@/components/post-composer'
import { useApp } from '@/context'
import { toast } from 'sonner'

const GEMINI_URL = 'https://gemini.google.com/app'

const PROMPT_TEMPLATES = [
  { label: 'LinkedIn post', prompt: 'Write a professional LinkedIn post about: ' },
  { label: 'Tweet / X post', prompt: 'Write a concise tweet (max 280 chars) about: ' },
  { label: 'Facebook update', prompt: 'Write a casual Facebook post about: ' },
  { label: 'Engagement post', prompt: 'Write an engaging social media post that encourages discussion about: ' },
  { label: 'Product launch', prompt: 'Write a social media announcement for the launch of: ' },
  { label: 'Behind the scenes', prompt: 'Write a behind-the-scenes social media post about: ' },
]

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success('Copied to clipboard'),
    () => toast.error('Failed to copy'),
  )
}

export function ComposePage() {
  const { activeProfile } = useApp()
  const [showAI, setShowAI] = useState(false)

  if (!activeProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">Welcome to Social Publisher</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Create a profile and connect your social media accounts to start
          publishing across platforms with a single click.
        </p>
        <Button asChild>
          <Link to="/settings">
            <Settings className="h-4 w-4 mr-2" />
            Go to Settings
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className={showAI ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'max-w-2xl mx-auto'}>
      <div>
        <div className="flex justify-end mb-3">
          <Button
            variant={showAI ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowAI(!showAI)}
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            {showAI ? 'Hide AI Assistant' : 'AI Assistant'}
          </Button>
        </div>
        <PostComposer profile={activeProfile} />
      </div>
      {showAI && (
        <Card className="flex flex-col">
          <CardHeader className="pb-3 flex-none">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Assistant
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAI(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Button className="w-full" asChild>
                <a href={GEMINI_URL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Google Gemini
                </a>
              </Button>
              <Button className="w-full" variant="outline" asChild>
                <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open ChatGPT
                </a>
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Opens in a new tab. Copy the AI response, then use the <strong>Paste</strong> button on the composer.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">How it works</h4>
              <ol className="text-sm text-muted-foreground space-y-1.5 list-none">
                <li className="flex gap-2">
                  <span className="font-medium text-foreground shrink-0">1.</span>
                  Copy a prompt template below (or write your own)
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground shrink-0">2.</span>
                  Paste it into Gemini and complete your request
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground shrink-0">3.</span>
                  Copy the AI-generated text
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground shrink-0">4.</span>
                  Click <strong>Paste</strong> on the composer <ArrowRight className="inline h-3 w-3" />
                </li>
              </ol>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Prompt templates</h4>
              <div className="space-y-1.5">
                {PROMPT_TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    className="w-full flex items-center gap-2 text-left text-sm px-3 py-2 rounded-md border hover:bg-accent transition-colors group"
                    onClick={() => copyToClipboard(t.prompt)}
                  >
                    <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <div className="min-w-0">
                      <div className="font-medium">{t.label}</div>
                      <div className="text-muted-foreground text-xs truncate">{t.prompt}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
