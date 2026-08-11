import { useEffect, useRef, useState, useTransition } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { LiveIndicator } from '@/components/live-indicator'
import { SongRanking } from '@/components/song-ranking'
import {
  getSetBySlug,
  subscribeToActiveSongs,
  subscribeToVotedSongIds,
  toggleVote,
} from '@/lib/sets'
import { getSetDisplayStatus } from '@/lib/utils'
import { getVoterId } from '@/lib/voter-id'
import type { DjSet, Song } from '@/lib/types'

export const Route = createFileRoute('/s/$slug')({
  component: PublicSetPage,
})

function sortByVotes(songs: Song[]) {
  return [...songs].sort((a, b) => b.voteCount - a.voteCount)
}

function applyPendingDeltas(songs: Song[], pending: Map<string, number>) {
  if (pending.size === 0) return sortByVotes(songs)
  return sortByVotes(
    songs.map((song) => {
      const delta = pending.get(song.id) ?? 0
      if (!delta) return song
      return { ...song, voteCount: Math.max(0, song.voteCount + delta) }
    }),
  )
}

function PublicSetPage() {
  const { slug } = Route.useParams()
  const [djSet, setDjSet] = useState<DjSet | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [voteError, setVoteError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  /** Unconfirmed local vote deltas, layered on top of the latest server songs. */
  const pendingDeltas = useRef(new Map<string, number>())
  /** Desired voted state until the votes subscription catches up. */
  const pendingVoted = useRef(new Map<string, boolean>())
  /** Server voteCount when a pending delta was first opened — clear when it moves. */
  const pendingBaselines = useRef(new Map<string, number>())
  const serverSongs = useRef<Song[]>([])

  useEffect(() => {
    const voterId = getVoterId()
    let unsubscribeSongs: (() => void) | undefined
    let unsubscribeVotes: (() => void) | undefined

    void (async () => {
      const set = await getSetBySlug(slug)
      if (!set) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setDjSet(set)
      setLoading(false)
      unsubscribeSongs = subscribeToActiveSongs(set.id, (next) => {
        for (const [songId, baseline] of pendingBaselines.current) {
          const curr = next.find((song) => song.id === songId)
          if (!curr || curr.voteCount === baseline) continue
          pendingBaselines.current.delete(songId)
          pendingDeltas.current.delete(songId)
        }
        serverSongs.current = next
        startTransition(() => {
          setSongs(applyPendingDeltas(next, pendingDeltas.current))
        })
      })
      unsubscribeVotes = subscribeToVotedSongIds(set.id, voterId, (next) => {
        for (const [songId, desired] of pendingVoted.current) {
          if (next.has(songId) === desired) pendingVoted.current.delete(songId)
        }
        const merged = new Set(next)
        for (const [songId, desired] of pendingVoted.current) {
          if (desired) merged.add(songId)
          else merged.delete(songId)
        }
        startTransition(() => setVotedIds(merged))
      })
    })()

    return () => {
      unsubscribeSongs?.()
      unsubscribeVotes?.()
    }
  }, [slug])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-white/55">
          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full w-1/2 animate-pulse rounded-full bg-[var(--accent)]/70" />
          </span>
          <p className="text-sm">Loading set…</p>
        </div>
      </main>
    )
  }

  if (notFound || !djSet) {
    return (
      <main className="flex min-h-screen items-center justify-center text-white/60">
        Set not found.
      </main>
    )
  }

  const displayStatus = getSetDisplayStatus(djSet)
  const votingDisabled = displayStatus === 'ended'

  const handleVote = (songId: string) => {
    if (votingDisabled) return

    setVoteError(null)
    const wasVoted = votedIds.has(songId)
    const delta = wasVoted ? -1 : 1
    const serverCount =
      serverSongs.current.find((song) => song.id === songId)?.voteCount ?? 0

    if (!pendingBaselines.current.has(songId)) {
      pendingBaselines.current.set(songId, serverCount)
    }
    pendingDeltas.current.set(
      songId,
      (pendingDeltas.current.get(songId) ?? 0) + delta,
    )
    if ((pendingDeltas.current.get(songId) ?? 0) === 0) {
      pendingDeltas.current.delete(songId)
      pendingBaselines.current.delete(songId)
    }
    pendingVoted.current.set(songId, !wasVoted)

    setVotedIds((prev) => {
      const next = new Set(prev)
      if (wasVoted) next.delete(songId)
      else next.add(songId)
      return next
    })
    setSongs(applyPendingDeltas(serverSongs.current, pendingDeltas.current))

    const voterId = getVoterId()
    void toggleVote(djSet.id, songId, voterId).catch((error) => {
      pendingDeltas.current.set(
        songId,
        (pendingDeltas.current.get(songId) ?? 0) - delta,
      )
      if ((pendingDeltas.current.get(songId) ?? 0) === 0) {
        pendingDeltas.current.delete(songId)
        pendingBaselines.current.delete(songId)
      }
      pendingVoted.current.delete(songId)

      setVotedIds((prev) => {
        const next = new Set(prev)
        if (wasVoted) next.add(songId)
        else next.delete(songId)
        return next
      })
      setSongs(applyPendingDeltas(serverSongs.current, pendingDeltas.current))
      setVoteError(
        error instanceof Error
          ? error.message
          : 'Your vote could not be saved. Please try again.',
      )
    })
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto w-full max-w-lg">
        <div className="vote-page-enter mb-8 text-center">
          <p className="display-font text-5xl text-white sm:text-6xl">
            {djSet.djName}
          </p>
          <p className="mt-2 text-white/70">Vote for what you want to hear</p>
          <div className="mt-4 flex justify-center">
            <LiveIndicator status={displayStatus} />
          </div>
        </div>

        {votingDisabled ? (
          <p className="vote-page-enter mb-6 text-center text-sm text-white/50">
            This set has ended. Voting is closed.
          </p>
        ) : null}
        {voteError ? (
          <p className="vote-page-enter mb-6 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-center text-sm text-red-100" role="alert">
            {voteError}
          </p>
        ) : null}

        <div className="vote-page-enter-delay">
          <SongRanking
            songs={songs}
            votedIds={votedIds}
            votingDisabled={votingDisabled}
            onVote={handleVote}
          />
        </div>
      </div>
    </main>
  )
}
