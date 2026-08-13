import { useEffect, useRef, useState, useTransition } from 'react'
import { LiveIndicator } from '@/components/live-indicator'
import { SetTheme } from '@/components/set-theme'
import { SongRanking } from '@/components/song-ranking'
import { useAnonymousVoterAuth } from '@/hooks/use-anonymous-voter-auth'
import {
  subscribeToActiveSongs,
  subscribeToBallot,
  subscribeToSet,
  toggleVote,
} from '@/lib/sets'
import { getSetDisplayStatus } from '@/lib/utils'
import type { DjSet, Song } from '@/lib/types'

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

export function PublicVotingPage({ initialSet }: { initialSet: DjSet }) {
  const { uid, loading: authLoading, error: authError } = useAnonymousVoterAuth()
  const [djSet, setDjSet] = useState<DjSet>(initialSet)
  const [songs, setSongs] = useState<Song[]>([])
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set())
  const [voteError, setVoteError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const pendingDeltas = useRef(new Map<string, number>())
  const pendingVoted = useRef(new Map<string, boolean>())
  const pendingBaselines = useRef(new Map<string, number>())
  const serverSongs = useRef<Song[]>([])

  const setId = djSet.id

  useEffect(() => subscribeToSet(setId, (next) => {
    if (next) setDjSet(next)
  }), [setId])

  useEffect(() => {
    if (!uid) return

    let unsubscribeSongs: (() => void) | undefined
    let unsubscribeBallot: (() => void) | undefined

    unsubscribeSongs = subscribeToActiveSongs(setId, (next) => {
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
    unsubscribeBallot = subscribeToBallot(setId, uid, (next) => {
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

    return () => {
      unsubscribeSongs?.()
      unsubscribeBallot?.()
    }
  }, [setId, uid])

  const displayStatus = getSetDisplayStatus(djSet)
  const votingDisabled = displayStatus === 'ended' || !uid

  const handleVote = (songId: string) => {
    if (votingDisabled || !uid) return

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

    void toggleVote(djSet.id, songId, uid).catch((error) => {
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

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-white/60">
        <p role="status">Starting voting session…</p>
      </main>
    )
  }

  if (authError) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 text-center text-red-200">
        <p role="alert">{authError}</p>
      </main>
    )
  }

  return (
    <SetTheme set={djSet} className="vote-page min-h-screen">
      <main className="px-4 py-8">
        <div className="mx-auto w-full max-w-lg">
          <div className="vote-page-enter mb-8 text-center">
            <p
              className="display-font text-5xl sm:text-6xl"
              style={{
                color: 'var(--accent)',
                textShadow: '0 0 42px color-mix(in srgb, var(--accent) 45%, transparent)',
              }}
            >
              {djSet.djName}
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              {djSet.name}
            </p>
            <p className="mt-3 text-sm font-medium uppercase tracking-[0.22em] text-[var(--secondary)]">
              Vote for what you want to hear
            </p>
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
            <p
              className="vote-page-enter mb-6 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-center text-sm text-red-100"
              role="alert"
            >
              {voteError}
            </p>
          ) : null}

          <div className="vote-page-enter-delay rounded-3xl border border-[var(--accent)]/15 bg-black/20 p-3 shadow-[0_0_48px_color-mix(in_srgb,var(--secondary)_12%,transparent)] sm:p-4">
            <SongRanking
              songs={songs}
              votedIds={votedIds}
              votingDisabled={votingDisabled}
              onVote={handleVote}
            />
          </div>
        </div>
      </main>
    </SetTheme>
  )
}
