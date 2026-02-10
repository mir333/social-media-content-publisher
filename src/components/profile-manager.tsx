import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, User } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { Profile } from '@/types'

export function ProfileManager({
  profiles,
  activeProfile,
  onCreateProfile,
  onDeleteProfile,
  onSwitchProfile,
}: {
  profiles: Profile[]
  activeProfile: Profile | null
  onCreateProfile: (name: string) => void
  onDeleteProfile: (id: string) => void
  onSwitchProfile: (id: string) => void
}) {
  const [newName, setNewName] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateProfile(newName.trim())
      setNewName('')
      setDialogOpen(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Profiles</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                New Profile
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Profile</DialogTitle>
                <DialogDescription>
                  A profile stores your social media connections. Create separate
                  profiles for different accounts.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="profile-name">Profile Name</Label>
                <Input
                  id="profile-name"
                  placeholder="e.g., Personal, Work"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={!newName.trim()}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No profiles yet. Create one to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                  profile.id === activeProfile?.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => onSwitchProfile(profile.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Object.keys(profile.connections).length} platform(s)
                      connected
                    </p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Profile</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete &ldquo;{profile.name}&rdquo;
                        and all its connections.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeleteProfile(profile.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
