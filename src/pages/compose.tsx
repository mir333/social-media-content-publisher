import { Link } from '@tanstack/react-router'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PostComposer } from '@/components/post-composer'
import { useApp } from '@/context'

export function ComposePage() {
  const { activeProfile } = useApp()

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
    <div className="max-w-2xl mx-auto">
      <PostComposer profile={activeProfile} />
    </div>
  )
}
