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
  const [, startTransition] = useTransition()
  const pendingDeltas = useRef(new Map<string, number>())
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
        // Absorb server updates into pending deltas so optimistic taps don't flicker
        for (const [songId, delta] of pendingDeltas.current) {
          const prev = serverSongs.current.find((s) => s.id === songId)
          const curr = next.find((s) => s.id === songId)
          if (!curr || !prev) continue
          const serverDelta = curr.voteCount - prev.voteCount
          if (serverDelta === 0) continue
          const remaining = delta - serverDelta
          if (remaining === 0) pendingDeltas.current.delete(songId)
          else pendingDeltas.current.set(songId, remaining)
        }
        serverSongs.current = next
        startTransition(() => {
          setSongs(applyPendingDeltas(next, pendingDeltas.current))
        })
      })
      unsubscribeVotes = subscribeToVotedSongIds(set.id, voterId, (next) => {
        startTransition(() => setVotedIds(next))
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

    const wasVoted = votedIds.has(songId)
    const delta = wasVoted ? -1 : 1

    pendingDeltas.current.set(
      songId,
      (pendingDeltas.current.get(songId) ?? 0) + delta,
    )

    setVotedIds((prev) => {
      const next = new Set(prev)
      if (wasVoted) next.delete(songId)
      else next.add(songId)
      return next
    })
    setSongs(applyPendingDeltas(serverSongs.current, pendingDeltas.current))

    const voterId = getVoterId()
    void toggleVote(djSet.id, songId, voterId).catch(() => {
      pendingDeltas.current.set(
        songId,
        (pendingDeltas.current.get(songId) ?? 0) - delta,
      )
      const remaining = pendingDeltas.current.get(songId) ?? 0
      if (remaining === 0) pendingDeltas.current.delete(songId)

      setVotedIds((prev) => {
        const next = new Set(prev)
        if (wasVoted) next.add(songId)
        else next.delete(songId)
        return next
      })
      setSongs(applyPendingDeltas(serverSongs.current, pendingDeltas.current))
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
