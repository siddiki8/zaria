import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Copy, QrCode } from 'lucide-react'
import { ProtectedRoute } from '@/components/protected-route'
import { LiveIndicator } from '@/components/live-indicator'
import { QrModal } from '@/components/qr-modal'
import { SetTimer } from '@/components/set-timer'
import { SongRanking } from '@/components/song-ranking'
import { SongSearch } from '@/components/song-search'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import {
  addSong,
  endSet,
  markSongPlayed,
  removeSong,
  subscribeToActiveSongs,
  subscribeToPlayedSongs,
  subscribeToSet,
} from '@/lib/sets'
import { getPublicSetUrl, getSetDisplayStatus } from '@/lib/utils'
import type { DjSet, LastFmTrackResult, Song } from '@/lib/types'

export const Route = createFileRoute('/sets/$setId')({
  component: SetDashboardPage,
})

function SetDashboardPage() {
  const { setId } = Route.useParams()
  const { user } = useAuth()
  const [djSet, setDjSet] = useState<DjSet | null>(null)
  const [activeSongs, setActiveSongs] = useState<Song[]>([])
  const [playedSongs, setPlayedSongs] = useState<Song[]>([])
  const [qrOpen, setQrOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [songsError, setSongsError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [ending, setEnding] = useState(false)

  useEffect(() => subscribeToSet(setId, setDjSet), [setId])
  useEffect(
    () =>
      subscribeToActiveSongs(setId, setActiveSongs, (error) =>
        setSongsError(error.message),
      ),
    [setId],
  )
  useEffect(() => subscribeToPlayedSongs(setId, setPlayedSongs), [setId])

  if (!djSet) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center text-white/60">
          Loading set...
        </div>
      </ProtectedRoute>
    )
  }

  if (user && djSet.djId !== user.uid) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center text-white/60">
          You do not have access to this set.
        </div>
      </ProtectedRoute>
    )
  }

  const publicUrl = getPublicSetUrl(djSet.slug)
  const displayStatus = getSetDisplayStatus(djSet)
  const ended = displayStatus === 'ended'

  const handleAddSong = async (track: LastFmTrackResult) => {
    await addSong(setId, track)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setActionError('Could not copy the link. Select and copy the URL from the QR code instead.')
    }
  }

  const handleEndSet = async () => {
    if (!window.confirm('End this set? Guests will no longer be able to vote.')) return
    setEnding(true)
    setActionError(null)
    try {
      await endSet(setId)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not end this set.')
    } finally {
      setEnding(false)
    }
  }

  const handleSongAction = async (action: () => Promise<void>) => {
    setActionError(null)
    try {
      await action()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update this song.')
    }
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen py-8">
        <div className="page-shell space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link to="/dashboard" className="text-sm text-white/60 hover:text-white">
                ← Dashboard
              </Link>
              <h1 className="mt-2 text-3xl font-bold text-white">{djSet.name}</h1>
              <div className="mt-3">
                <LiveIndicator status={displayStatus} />
              </div>
              <div className="mt-4 max-w-sm">
                <SetTimer set={djSet} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => void handleCopy()}>
                <Copy className="h-4 w-4" />
                {copied ? 'Copied!' : 'Copy link'}
              </Button>
              <Button variant="secondary" onClick={() => setQrOpen(true)}>
                <QrCode className="h-4 w-4" />
                QR code
              </Button>
              {!ended ? (
                <Button
                  variant="danger"
                  onClick={() => void handleEndSet()}
                  disabled={ending}
                >
                  {ending ? 'Ending…' : 'End set'}
                </Button>
              ) : null}
            </div>
          </div>
          {actionError ? (
            <p className="text-sm text-red-300" role="alert">
              {actionError}
            </p>
          ) : null}

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Live ranking
            </h2>
            {songsError ? (
              <p className="mb-4 text-sm text-red-300" role="alert">
                Could not load songs: {songsError}
              </p>
            ) : null}
            <SongRanking
              songs={activeSongs}
              djView
              onMarkPlayed={(songId) =>
                void handleSongAction(() => markSongPlayed(setId, songId))
              }
              onRemove={(songId) =>
                void handleSongAction(() => removeSong(setId, songId))
              }
            />
          </section>

          {!ended ? (
            <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
              <h2 className="mb-4 text-lg font-bold text-white">Add songs</h2>
              <SongSearch onAdd={handleAddSong} />
            </section>
          ) : null}

          {playedSongs.length > 0 ? (
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
                Played
              </h2>
              <div className="space-y-2">
                {playedSongs.map((song) => (
                  <div
                    key={song.id}
                    className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] p-3 opacity-70"
                  >
                    {song.artworkUrl ? (
                      <img
                        src={song.artworkUrl}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : null}
                    <div>
                      <p className="font-medium text-white">{song.title}</p>
                      <p className="text-sm text-white/50">{song.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <QrModal open={qrOpen} onClose={() => setQrOpen(false)} url={publicUrl} />
    </ProtectedRoute>
  )
}
