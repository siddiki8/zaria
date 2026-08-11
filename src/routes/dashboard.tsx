import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { DjNameForm } from '@/components/dj-name-form'
import { ProtectedRoute } from '@/components/protected-route'
import { LiveIndicator } from '@/components/live-indicator'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { subscribeToDjSets } from '@/lib/sets'
import { formatSetTime, getSetDisplayStatus } from '@/lib/utils'
import type { DjSet } from '@/lib/types'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { user, profile, logout, saveDjName } = useAuth()
  const [sets, setSets] = useState<DjSet[]>([])
  const hasDjName = Boolean(profile?.djName.trim())

  useEffect(() => {
    if (!user) return
    return subscribeToDjSets(user.uid, setSets)
  }, [user])

  return (
    <ProtectedRoute>
      <main className="min-h-screen py-10">
        <div className="page-shell">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="display-font text-5xl text-white">ZARIA</p>
              <p className="mt-1 text-white/60">Your sets</p>
            </div>
            <div className="flex gap-2">
              {hasDjName ? (
                <Link to="/sets/new">
                  <Button>
                    <Plus className="h-4 w-4" />
                    New set
                  </Button>
                </Link>
              ) : (
                <Button disabled>
                  <Plus className="h-4 w-4" />
                  New set
                </Button>
              )}
              <Button variant="secondary" onClick={() => void logout()}>
                Sign out
              </Button>
            </div>
          </div>

          <div className="mb-8">
            <DjNameForm
              djName={profile?.djName ?? ''}
              onSave={saveDjName}
              disabled={!profile}
            />
            {!hasDjName ? (
              <p className="mt-2 text-sm text-[var(--accent)]">
                Set your DJ name before creating a set.
              </p>
            ) : null}
          </div>

          {sets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
              <p className="text-white/60">No sets yet.</p>
              {hasDjName ? (
                <Link to="/sets/new" className="mt-4 inline-block">
                  <Button>Create your first set</Button>
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {sets.map((set) => {
                const displayStatus = getSetDisplayStatus(set)
                return (
                  <Link
                    key={set.id}
                    to="/sets/$setId"
                    params={{ setId: set.id }}
                    className="block rounded-2xl border border-white/8 bg-white/[0.03] p-5 transition hover:border-[var(--accent)]/30"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold text-white">{set.name}</h2>
                        <p className="mt-1 text-sm text-white/60">
                          {formatSetTime(set.startAt, set.timezone)} ·{' '}
                          {set.durationMinutes} min
                        </p>
                      </div>
                      <LiveIndicator status={displayStatus} />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  )
}
