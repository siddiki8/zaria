import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { nanoid } from 'nanoid'
import { ColorPicker, ColorPreview } from '@/components/color-picker'
import { ProtectedRoute } from '@/components/protected-route'
import { SetTheme } from '@/components/set-theme'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { useAuth } from '@/contexts/auth-context'
import { createSet, allocateSetSlug } from '@/lib/sets'
import { saveDjProfile } from '@/lib/users'
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  PRIMARY_SWATCHES,
  SECONDARY_SWATCHES,
  normalizeHexColor,
} from '@/lib/set-theme'

export const Route = createFileRoute('/sets/new')({
  component: NewSetPage,
})

const DURATION_OPTIONS = [60, 90, 120, 180, 240]

function NewSetPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'asap' | 'schedule'>('asap')
  const [startAt, setStartAt] = useState('')
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  )
  const [durationMinutes, setDurationMinutes] = useState(120)
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR)
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY_COLOR)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const djName = profile?.djName.trim() ?? ''
  const needsDjName = !djName

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user || !name.trim()) return

    if (needsDjName) {
      setError('Set your DJ name in Settings before creating a set.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const now = new Date()
      const scheduledStart =
        mode === 'asap' ? now : startAt ? new Date(startAt) : now

      if (mode === 'schedule' && scheduledStart <= now) {
        throw new Error('Scheduled start time must be in the future.')
      }

      const setSlug = await allocateSetSlug(user.uid, name.trim())
      let djSlug = profile?.djSlug
      if (!djSlug) {
        const saved = await saveDjProfile(user.uid, djName)
        djSlug = saved.djSlug
      }

      const normalizedPrimary = normalizeHexColor(primaryColor)
      const normalizedSecondary = normalizeHexColor(secondaryColor)
      if (!normalizedPrimary || !normalizedSecondary) {
        throw new Error('Choose valid primary and second colors.')
      }

      const setId = await createSet({
        djId: user.uid,
        djName,
        djSlug,
        name: name.trim(),
        slug: nanoid(8),
        setSlug,
        status: mode === 'asap' ? 'live' : 'scheduled',
        startAt: scheduledStart,
        timezone,
        durationMinutes,
        primaryColor: normalizedPrimary,
        secondaryColor: normalizedSecondary,
      })

      void navigate({ to: '/sets/$setId', params: { setId } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create set')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ProtectedRoute>
      <SetTheme set={{ primaryColor, secondaryColor }}>
        <main className="min-h-screen py-10">
          <div className="page-shell max-w-xl">
            <Link to="/dashboard" className="text-sm text-white/60 hover:text-white">
              ← Back to dashboard
            </Link>
            <h1 className="mt-4 text-3xl font-bold text-white">Create a set</h1>
            <p className="mt-2 text-white/60">
              Start now for instant voting, or schedule a set for later.
            </p>

            {needsDjName ? (
              <div className="mt-8 rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/5 p-5">
                <p className="text-sm text-white/80">
                  Set your DJ name in Settings before creating a set. Fans see
                  that name on your voting page and share links.
                </p>
                <Link to="/settings" className="mt-3 inline-block">
                  <Button size="sm">Go to Settings</Button>
                </Link>
              </div>
            ) : null}

            <form onSubmit={(event) => void handleSubmit(event)} className="mt-8 space-y-6">
              <div>
                <Label htmlFor="name">Set name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Friday Night Heat"
                  required
                  aria-describedby="set-name-hint"
                />
                <p id="set-name-hint" className="mt-2 text-sm text-white/45">
                  Use a name your guests will recognize.
                </p>
              </div>

              <fieldset>
                <legend className="mb-2 block text-sm font-medium text-white/70">Start</legend>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={mode === 'asap' ? 'default' : 'secondary'}
                    onClick={() => setMode('asap')}
                    aria-pressed={mode === 'asap'}
                  >
                    Start ASAP
                  </Button>
                  <Button
                    type="button"
                    variant={mode === 'schedule' ? 'default' : 'secondary'}
                    onClick={() => setMode('schedule')}
                    aria-pressed={mode === 'schedule'}
                  >
                    Schedule
                  </Button>
                </div>
              </fieldset>

              {mode === 'schedule' ? (
                <div>
                  <Label htmlFor="startAt">Start time</Label>
                  <Input
                    id="startAt"
                    type="datetime-local"
                    value={startAt}
                    onChange={(event) => setStartAt(event.target.value)}
                    required
                    min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                    aria-describedby="start-time-hint"
                  />
                  <p id="start-time-hint" className="mt-2 text-sm text-white/45">
                    Times are interpreted in the timezone below.
                  </p>
                </div>
              ) : null}

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="duration">Duration</Label>
                <Select
                  id="duration"
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(Number(event.target.value))}
                >
                  {DURATION_OPTIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} minutes
                    </option>
                  ))}
                </Select>
              </div>

              <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
                <h2 className="text-lg font-bold text-white">Look</h2>
                <p className="mt-1 text-sm text-white/50">
                  Pick colors for your guest voting page. You can change these later in Settings.
                </p>
                <div className="mt-5 space-y-5">
                  <ColorPreview
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                  />
                  <ColorPicker
                    label="Primary color"
                    description="Buttons, votes, live indicator, and rankings."
                    value={primaryColor}
                    swatches={PRIMARY_SWATCHES}
                    onChange={setPrimaryColor}
                  />
                  <ColorPicker
                    label="Second color"
                    description="Ambient glow and scheduled status accents."
                    value={secondaryColor}
                    swatches={SECONDARY_SWATCHES}
                    onChange={setSecondaryColor}
                  />
                </div>
              </section>

              {error ? (
                <p className="text-sm text-red-300" role="alert">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                size="lg"
                disabled={submitting || needsDjName}
                className="w-full sm:w-auto"
              >
                {submitting ? 'Creating...' : 'Create set'}
              </Button>
            </form>
          </div>
        </main>
      </SetTheme>
    </ProtectedRoute>
  )
}
