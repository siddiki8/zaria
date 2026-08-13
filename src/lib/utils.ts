import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPublicSetPath(
  set: Pick<{ slug: string; djSlug?: string; setSlug?: string }, 'slug' | 'djSlug' | 'setSlug'>,
) {
  if (set.djSlug && set.setSlug) {
    return `/s/${set.djSlug}/${set.setSlug}`
  }
  return `/s/${set.slug}`
}

export function getPublicSetUrl(
  set: Pick<{ slug: string; djSlug?: string; setSlug?: string }, 'slug' | 'djSlug' | 'setSlug'>,
) {
  const path = getPublicSetPath(set)
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`
  }
  return path
}

export function formatSetTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(date)
}

export function getSetEndTime(set: { startAt: Date; durationMinutes: number }) {
  return new Date(set.startAt.getTime() + set.durationMinutes * 60 * 1000)
}

export function getSetDisplayStatus(set: {
  status: string
  startAt: Date
  durationMinutes: number
}) {
  if (set.status === 'ended') return 'ended' as const
  const now = new Date()
  if (now >= getSetEndTime(set)) return 'ended' as const
  if (set.status === 'live' || set.startAt <= now) return 'live' as const
  return 'scheduled' as const
}

export function formatCountdown(totalSeconds: number) {
  const seconds = Math.max(0, totalSeconds)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}
