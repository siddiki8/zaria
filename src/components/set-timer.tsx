import { useEffect, useState } from 'react'
import { Clock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { endSet, extendSetDuration } from '@/lib/sets'
import {
  formatCountdown,
  getSetDisplayStatus,
  getSetEndTime,
} from '@/lib/utils'
import type { DjSet } from '@/lib/types'

export function SetTimer({
  set,
  onExtend,
}: {
  set: DjSet
  onExtend?: () => void
}) {
  const [now, setNow] = useState(() => Date.now())
  const [extending, setExtending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  // Persist expiry so Firestore status matches the timer (voting rules also check duration).
  useEffect(() => {
    if (set.status === 'ended') return
    const remainingMs = getSetEndTime(set).getTime() - Date.now()
    if (remainingMs <= 0) {
      void endSet(set.id)
      return
    }
    const timeout = window.setTimeout(() => {
      void endSet(set.id)
    }, remainingMs)
    return () => window.clearTimeout(timeout)
  }, [set.id, set.status, set.startAt, set.durationMinutes])

  const displayStatus = getSetDisplayStatus(set)
  const endTime = getSetEndTime(set)
  const startMs = set.startAt.getTime()
  const endMs = endTime.getTime()

  let label = 'Time left'
  let seconds = 0

  if (displayStatus === 'ended') {
    label = 'Set ended'
  } else if (now < startMs) {
    label = 'Starts in'
    seconds = Math.ceil((startMs - now) / 1000)
  } else {
    seconds = Math.ceil((endMs - now) / 1000)
    if (seconds <= 0) {
      label = 'Set ended'
      seconds = 0
    }
  }

  const handleExtend = async () => {
    setExtending(true)
    setError(null)
    try {
      await extendSetDuration(set.id, 10)
      onExtend?.()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not extend the set.')
    } finally {
      setExtending(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Clock className="h-5 w-5 shrink-0 text-[var(--accent)]" />
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/50">
              {label}
            </p>
            <p className="display-font text-3xl text-white tabular-nums">
              {displayStatus === 'ended' ? '—' : formatCountdown(seconds)}
            </p>
          </div>
        </div>
        {displayStatus !== 'ended' ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => void handleExtend()}
            disabled={extending}
          >
            <Plus className="h-4 w-4" />
            {extending ? 'Extending…' : '10 min'}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
