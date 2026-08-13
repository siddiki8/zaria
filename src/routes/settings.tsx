import { Link, createFileRoute } from '@tanstack/react-router'
import { DjNameForm } from '@/components/dj-name-form'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { slugify } from '@/lib/slug'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { profile, logout, saveDjName } = useAuth()
  const djSlug = profile?.djSlug
  const previewSlug = djSlug ?? (profile?.djName.trim() ? slugify(profile.djName) : null)

  return (
    <ProtectedRoute>
      <main className="min-h-screen py-10">
        <div className="page-shell max-w-xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link
                to="/dashboard"
                className="text-sm text-white/60 hover:text-white"
              >
                ← Dashboard
              </Link>
              <h1 className="mt-2 text-3xl font-bold text-white">Settings</h1>
              <p className="mt-2 text-white/60">
                Manage how your name appears on voting pages and in share links.
              </p>
            </div>
            <Button variant="secondary" onClick={() => void logout()}>
              Sign out
            </Button>
          </div>

          <DjNameForm
            djName={profile?.djName ?? ''}
            onSave={saveDjName}
            disabled={!profile}
            showSlugWarning
          />

          {previewSlug ? (
            <p className="mt-4 text-sm text-white/50">
              Your public voting URLs start with{' '}
              <span className="font-mono text-white/70">/s/{previewSlug}/</span>
              {djSlug ? null : (
                <span className="text-white/40">
                  {' '}
                  (preview — save to confirm)
                </span>
              )}
            </p>
          ) : null}
        </div>
      </main>
    </ProtectedRoute>
  )
}
