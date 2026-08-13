export function LiveIndicator({
  status,
}: {
  status: 'scheduled' | 'live' | 'ended'
}) {
  if (status === 'ended') {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-white/50">
        Ended
      </span>
    )
  }

  if (status === 'scheduled') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--secondary)]/35 bg-[var(--secondary)]/12 px-3 py-1 text-sm text-[var(--secondary)]">
        <span className="h-2 w-2 rounded-full bg-[var(--secondary)]" />
        Scheduled
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/35 bg-[var(--accent)]/12 px-3 py-1 text-sm font-semibold text-[var(--accent)] shadow-[0_0_24px_color-mix(in_srgb,var(--accent)_22%,transparent)]">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
      </span>
      LIVE
    </span>
  )
}
