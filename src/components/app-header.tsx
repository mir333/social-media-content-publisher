import { Link, useRouterState } from '@tanstack/react-router'
import { PenSquare, Settings, Moon, Sun, Share2, Heart } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Profile } from '@/types'

export function AppHeader({
  profiles,
  activeProfile,
  onSwitchProfile,
}: {
  profiles: Profile[]
  activeProfile: Profile | null
  onSwitchProfile: (id: string) => void
}) {
  const { theme, setTheme } = useTheme()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center gap-4 px-4">
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold hidden sm:block">Social Publisher</h1>
        </div>

        <nav className="flex items-center gap-1 ml-4">
          <Button
            variant={pathname === '/' ? 'default' : 'ghost'}
            size="sm"
            asChild
          >
            <Link to="/">
              <PenSquare className="h-4 w-4 mr-1.5" />
              Compose
            </Link>
          </Button>
          <Button
            variant={pathname === '/settings' ? 'default' : 'ghost'}
            size="sm"
            asChild
          >
            <Link to="/settings">
              <Settings className="h-4 w-4 mr-1.5" />
              Settings
            </Link>
          </Button>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {profiles.length > 0 && (
            <Select
              value={activeProfile?.id ?? ''}
              onValueChange={onSwitchProfile}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select profile" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button variant="ghost" size="sm" asChild>
            <a
              href="https://revolut.me/miroslqeu1?note=Donation"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Heart className="h-4 w-4 mr-1.5 text-pink-500" />
              <span className="hidden sm:inline">Donate</span>
            </a>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
