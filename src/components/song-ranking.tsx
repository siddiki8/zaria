import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useArtworkPalette } from '@/hooks/use-artwork-palette'
import { useFlipList } from '@/hooks/use-flip-list'
import { cn } from '@/lib/utils'
import type { Song } from '@/lib/types'

interface SongRankingProps {
  songs: Song[]
  votedIds?: Set<string>
  votingDisabled?: boolean
  onVote?: (songId: string) => void
  onMarkPlayed?: (songId: string) => void
  onRemove?: (songId: string) => void
  djView?: boolean
}

export function SongRanking({
  songs,
  votedIds,
  votingDisabled,
  onVote,
  onMarkPlayed,
  onRemove,
  djView,
}: SongRankingProps) {
  const songIds = songs.map((song) => song.id)
  const { register } = useFlipList(songIds)

  if (songs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--accent)]/25 bg-[var(--accent)]/[0.04] p-10 text-center text-white/55">
        No songs yet. Add tracks to start voting.
      </div>
    )
  }

  return (
    <div className="rank-list flex flex-col gap-3">
      {songs.map((song, index) => (
        <RankRow
          key={song.id}
          flipRef={register(song.id)}
          song={song}
          index={index}
          voted={votedIds?.has(song.id) ?? false}
          votingDisabled={votingDisabled}
          djView={djView}
          onVote={onVote}
          onMarkPlayed={onMarkPlayed}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}

interface RankRowProps {
  flipRef: (node: HTMLElement | null) => void
  song: Song
  index: number
  voted: boolean
  votingDisabled?: boolean
  djView?: boolean
  onVote?: (songId: string) => void
  onMarkPlayed?: (songId: string) => void
  onRemove?: (songId: string) => void
}

function RankRow({
  flipRef,
  song,
  index,
  voted,
  votingDisabled,
  djView,
  onVote,
  onMarkPlayed,
  onRemove,
}: RankRowProps) {
  const [rankFlash, setRankFlash] = useState<'up' | 'down' | null>(null)
  const prevIndex = useRef(index)
  const palette = useArtworkPalette(song.artworkUrl)
  const artColor = palette?.vibrant

  useEffect(() => {
    const prev = prevIndex.current
    if (prev === index) return
    setRankFlash(index < prev ? 'up' : 'down')
    prevIndex.current = index
    const timer = window.setTimeout(() => setRankFlash(null), 700)
    return () => window.clearTimeout(timer)
  }, [index])

  return (
    <div
      ref={flipRef}
      className="rank-item"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <div
        className={cn(
          'rank-item-inner relative flex items-center gap-4 rounded-2xl border p-4',
          palette
            ? 'border-[color-mix(in_srgb,var(--art-vibrant)_32%,rgba(255,255,255,0.08))]'
            : 'border-white/8 bg-white/[0.03]',
          rankFlash === 'up' && 'rank-flash-up',
          rankFlash === 'down' && 'rank-flash-down',
        )}
        style={
          palette
            ? ({
                '--art-vibrant': palette.vibrant,
                '--art-muted': palette.muted,
                '--art-dark': palette.dark,
                background: `linear-gradient(90deg, color-mix(in srgb, ${palette.dark} 55%, #050505) 0%, color-mix(in srgb, ${palette.muted} 22%, #080808) 48%, #080808 100%)`,
                boxShadow: `inset 3px 0 0 ${palette.vibrant}, 0 0 24px color-mix(in srgb, ${palette.vibrant} 12%, transparent)`,
              } as CSSProperties)
            : undefined
        }
      >
        {song.artworkUrl ? (
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
            aria-hidden
          >
            <img
              src={song.artworkUrl}
              alt=""
              className="absolute -left-6 top-1/2 h-[180%] w-48 -translate-y-1/2 object-cover opacity-45 blur-2xl saturate-150"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/45 to-black/72" />
          </div>
        ) : null}

        <div
          className={cn(
            'relative z-10 w-8 shrink-0 text-center text-lg font-bold tabular-nums transition-colors duration-300',
            rankFlash === 'down' && 'text-white/45',
          )}
          style={
            rankFlash === 'down'
              ? undefined
              : { color: artColor ?? 'var(--accent)' }
          }
        >
          #{index + 1}
        </div>

        {song.artworkUrl ? (
          <img
            src={song.artworkUrl}
            alt=""
            className="relative z-10 h-14 w-14 shrink-0 rounded-xl object-cover shadow-[0_0_18px_color-mix(in_srgb,var(--art-vibrant)_28%,transparent)] ring-1 ring-white/15"
            draggable={false}
          />
        ) : (
          <div className="relative z-10 h-14 w-14 shrink-0 rounded-xl bg-white/5" />
        )}

        <div className="relative z-10 min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-white drop-shadow">
            {song.title}
          </p>
          <p className="truncate text-sm text-white/70">{song.artist}</p>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          {djView ? (
            <>
              <VoteCount
                count={song.voteCount}
                className="min-w-12 text-right text-sm font-semibold"
                style={{ color: artColor ?? 'var(--accent)' }}
              />
              {onMarkPlayed ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onMarkPlayed(song.id)}
                >
                  Played
                </Button>
              ) : null}
              {onRemove ? (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onRemove(song.id)}
                >
                  Remove
                </Button>
              ) : null}
            </>
          ) : (
            <VoteButton
              count={song.voteCount}
              voted={voted}
              disabled={votingDisabled}
              artColor={artColor}
              onClick={() => onVote?.(song.id)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function VoteButton({
  count,
  voted,
  disabled,
  artColor,
  onClick,
}: {
  count: number
  voted: boolean
  disabled?: boolean
  artColor?: string
  onClick: () => void
}) {
  const [popping, setPopping] = useState(false)
  const unvotedStyle = artColor
    ? {
        borderColor: `color-mix(in srgb, ${artColor} 45%, rgba(255,255,255,0.12))`,
        backgroundColor: `color-mix(in srgb, ${artColor} 16%, rgba(255,255,255,0.04))`,
        color: '#fff',
        boxShadow: `0 0 16px color-mix(in srgb, ${artColor} 18%, transparent)`,
      }
    : undefined

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={voted}
      aria-label={`${voted ? 'Remove vote for' : 'Vote for'} this song. ${count} ${count === 1 ? 'vote' : 'votes'}.`}
      onClick={() => {
        setPopping(true)
        onClick()
        window.setTimeout(() => setPopping(false), 280)
      }}
      className={cn(
        'vote-btn flex min-w-16 flex-col items-center rounded-xl px-3 py-2',
        voted
          ? 'vote-btn--on bg-[var(--accent)] text-[var(--accent-foreground)]'
          : 'border border-white/10 bg-white/5 text-white hover:border-[var(--accent)]/45 hover:bg-white/[0.07]',
        disabled && 'cursor-not-allowed opacity-50',
        popping && 'vote-btn--pop',
      )}
      style={voted ? undefined : unvotedStyle}
    >
      <ChevronUp
        className={cn(
          'h-4 w-4 transition-transform duration-200',
          voted && 'scale-110',
        )}
      />
      <VoteCount count={count} className="text-sm font-bold tabular-nums" />
    </button>
  )
}

function VoteCount({
  count,
  className,
  style,
}: {
  count: number
  className?: string
  style?: CSSProperties
}) {
  const prev = useRef(count)
  const [delta, setDelta] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (prev.current === count) return
    setDelta(count > prev.current ? 'up' : 'down')
    prev.current = count
    const timer = window.setTimeout(() => setDelta(null), 450)
    return () => window.clearTimeout(timer)
  }, [count])

  return (
    <span
      className={cn(
        className,
        'inline-block',
        delta === 'up' && 'vote-count-up',
        delta === 'down' && 'vote-count-down',
      )}
      style={style}
    >
      {count}
    </span>
  )
}
