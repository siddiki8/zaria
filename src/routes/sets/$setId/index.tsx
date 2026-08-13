import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { SongRanking } from '@/components/song-ranking'
import { SongSearch } from '@/components/song-search'
import { useSetContext } from '@/contexts/set-context'
import {
  addSong,
  markSongPlayed,
  removeSong,
  subscribeToActiveSongs,
  subscribeToPlayedSongs,
} from '@/lib/sets'
import type { LastFmTrackResult, Song } from '@/lib/types'

export const Route = createFileRoute('/sets/$setId/')({
  component: SetMusicPage,
})

function SetMusicPage() {
  const { setId, ended, setActionError } = useSetContext()
  const [activeSongs, setActiveSongs] = useState<Song[]>([])
  const [playedSongs, setPlayedSongs] = useState<Song[]>([])
  const [songsError, setSongsError] = useState<string | null>(null)

  useEffect(
    () =>
      subscribeToActiveSongs(setId, setActiveSongs, (error) =>
        setSongsError(error.message),
      ),
    [setId],
  )
  useEffect(() => subscribeToPlayedSongs(setId, setPlayedSongs), [setId])

  const handleAddSong = async (track: LastFmTrackResult) => {
    await addSong(setId, track)
  }

  const handleSongAction = async (action: () => Promise<void>) => {
    setActionError(null)
    try {
      await action()
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not update this song.',
      )
    }
  }

  return (
    <div className="space-y-8 pt-2">
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
  )
}
