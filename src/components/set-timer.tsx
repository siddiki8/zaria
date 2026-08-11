import { useEffect, useState } from 'react'
import { Clock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { extendSetDuration } from '@/lib/sets'
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

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

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
      label = 'Time left'
      seconds = 0
    }
  }

  const handleExtend = async () => {
    await extendSetDuration(set.id, 10)
    onExtend?.()
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
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
        >
          <Plus className="h-4 w-4" />
          10 min
        </Button>
      ) : null}
    </div>
  )
}
