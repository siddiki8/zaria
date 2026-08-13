import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Plus, Settings } from 'lucide-react'
import { ProtectedRoute } from '@/components/protected-route'
import { LiveIndicator } from '@/components/live-indicator'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { getSetColors } from '@/lib/set-theme'
import { backfillSetSlugsForDj, subscribeToDjSets } from '@/lib/sets'
import { saveDjProfile } from '@/lib/users'
import { formatSetTime, getSetDisplayStatus } from '@/lib/utils'
import type { DjSet } from '@/lib/types'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { user, profile } = useAuth()
  const [sets, setSets] = useState<DjSet[]>([])
  const [setsLoading, setSetsLoading] = useState(true)
  const hasDjName = Boolean(profile?.djName.trim())

  useEffect(() => {
    if (!user) return
    setSetsLoading(true)
    return subscribeToDjSets(user.uid, (nextSets) => {
      setSets(nextSets)
      setSetsLoading(false)
    })
  }, [user])

  useEffect(() => {
    if (!user || !profile?.djName.trim()) return

    void (async () => {
      let djSlug = profile.djSlug
      if (!djSlug) {
        const saved = await saveDjProfile(user.uid, profile.djName.trim())
        djSlug = saved.djSlug
      }
      await backfillSetSlugsForDj(user.uid, djSlug, profile.djName.trim())
    })()
  }, [user, profile?.djName, profile?.djSlug])

  return (
    <ProtectedRoute>
      <main className="min-h-screen py-10">
        <div className="page-shell">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="display-font text-4xl text-white sm:text-5xl">What Should Play?</p>
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
              <Link to="/settings">
                <Button variant="secondary">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </Link>
            </div>
          </div>

          {!hasDjName ? (
            <div className="mb-8 rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/5 p-5">
              <p className="text-sm text-white/80">
                Set your DJ name in Settings before creating a set.
              </p>
              <Link to="/settings" className="mt-3 inline-block">
                <Button size="sm">Go to Settings</Button>
              </Link>
            </div>
          ) : null}

          {setsLoading ? (
            <div className="app-loader" role="status">
              <p>Loading your sets…</p>
            </div>
          ) : sets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
              <h2 className="text-lg font-semibold text-white">Your first set starts here</h2>
              <p className="mt-2 text-white/60">
                Create a set, share its link, then let the crowd shape the next track.
              </p>
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
                const colors = getSetColors(set)
                return (
                  <Link
                    key={set.id}
                    to="/sets/$setId"
                    params={{ setId: set.id }}
                    className="group relative block overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] p-5 transition hover:border-[var(--accent)]/30"
                  >
                    <div
                      className="absolute inset-y-0 left-0 w-1"
                      style={{ backgroundColor: colors.primaryColor }}
                      aria-hidden
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3 pl-2">
                      <div>
                        <h2 className="text-xl font-bold text-white transition group-hover:text-[var(--accent)]">
                          {set.name}
                        </h2>
                        <p className="mt-1 text-sm text-white/60">
                          {formatSetTime(set.startAt, set.timezone)} ·{' '}
                          {set.durationMinutes} min
                        </p>
                        <div className="mt-2 flex items-center gap-1.5" aria-hidden>
                          <span
                            className="h-3 w-3 rounded-full ring-1 ring-white/20"
                            style={{ backgroundColor: colors.primaryColor }}
                          />
                          <span
                            className="h-3 w-3 rounded-full ring-1 ring-white/20"
                            style={{ backgroundColor: colors.secondaryColor }}
                          />
                        </div>
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
