import { useEffect, useRef, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
      <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-white/50">
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
      className="rank-item will-change-transform"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <div
        className={cn(
          'rank-item-inner flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4',
          rankFlash === 'up' && 'rank-flash-up',
          rankFlash === 'down' && 'rank-flash-down',
        )}
      >
        <div
          className={cn(
            'w-8 shrink-0 text-center text-lg font-bold tabular-nums transition-colors duration-300',
            rankFlash === 'down' ? 'text-white/45' : 'text-[var(--accent)]',
          )}
        >
          #{index + 1}
        </div>

        {song.artworkUrl ? (
          <img
            src={song.artworkUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-xl object-cover"
            draggable={false}
          />
        ) : (
          <div className="h-14 w-14 shrink-0 rounded-xl bg-white/5" />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-white">
            {song.title}
          </p>
          <p className="truncate text-sm text-white/60">{song.artist}</p>
        </div>

        <div className="flex items-center gap-2">
          {djView ? (
            <>
              <VoteCount
                count={song.voteCount}
                className="min-w-12 text-right text-sm font-semibold text-[var(--accent)]"
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
  onClick,
}: {
  count: number
  voted: boolean
  disabled?: boolean
  onClick: () => void
}) {
  const [popping, setPopping] = useState(false)

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        setPopping(true)
        onClick()
        window.setTimeout(() => setPopping(false), 280)
      }}
      className={cn(
        'vote-btn flex min-w-16 flex-col items-center rounded-xl px-3 py-2',
        voted
          ? 'vote-btn--on bg-[var(--accent)] text-[#050505]'
          : 'border border-white/10 bg-white/5 text-white hover:border-[var(--accent)]/45 hover:bg-white/[0.07]',
        disabled && 'cursor-not-allowed opacity-50',
        popping && 'vote-btn--pop',
      )}
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
}: {
  count: number
  className?: string
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
    >
      {count}
    </span>
  )
}
