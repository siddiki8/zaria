import { useEffect, useRef, useState } from 'react'
import { Check, Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { searchTracks } from '@/server/lastfm'
import type { LastFmTrackResult } from '@/lib/types'

const SEARCH_DEBOUNCE_MS = 350

function trackKey(track: Pick<LastFmTrackResult, 'artist' | 'title'>) {
  return `${track.artist}::${track.title}`
}

export function SongSearch({
  onAdd,
  disabled,
}: {
  onAdd: (track: LastFmTrackResult) => Promise<void>
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LastFmTrackResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const [addingKey, setAddingKey] = useState<string | null>(null)
  const [addedKey, setAddedKey] = useState<string | null>(null)
  const [manualTitle, setManualTitle] = useState('')
  const [manualArtist, setManualArtist] = useState('')
  const [manualAdding, setManualAdding] = useState(false)
  const requestId = useRef(0)
  const addedTimeout = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (addedTimeout.current) window.clearTimeout(addedTimeout.current)
    }
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      requestId.current += 1
      setResults([])
      setError(null)
      setLoading(false)
      return
    }

    const id = ++requestId.current
    setLoading(true)
    setError(null)

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const tracks = await searchTracks({ data: { q: trimmed } })
          if (id !== requestId.current) return
          setResults(tracks)
        } catch (err) {
          if (id !== requestId.current) return
          setError(err instanceof Error ? err.message : 'Search failed')
          setResults([])
        } finally {
          if (id === requestId.current) setLoading(false)
        }
      })()
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [query])

  const showAddedFeedback = (key: string) => {
    setAddedKey(key)
    if (addedTimeout.current) window.clearTimeout(addedTimeout.current)
    addedTimeout.current = window.setTimeout(() => setAddedKey(null), 2000)
  }

  const handleAddTrack = async (track: LastFmTrackResult) => {
    const key = trackKey(track)
    setAddingKey(key)
    setAddError(null)
    try {
      await onAdd(track)
      showAddedFeedback(key)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add song')
    } finally {
      setAddingKey(null)
    }
  }

  const handleManualAdd = async () => {
    if (!manualTitle.trim() || !manualArtist.trim()) return
    setManualAdding(true)
    setAddError(null)
    try {
      await onAdd({ title: manualTitle.trim(), artist: manualArtist.trim() })
      setManualTitle('')
      setManualArtist('')
      showAddedFeedback('manual')
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add song')
    } finally {
      setManualAdding(false)
    }
  }

  const clearSearch = () => {
    requestId.current += 1
    setQuery('')
    setResults([])
    setError(null)
    setLoading(false)
  }

  const hasQuery = query.length > 0

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="song-search">Search Last.fm</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input
            id="song-search"
            className={hasQuery ? 'pl-10 pr-10' : 'pl-10'}
            placeholder="Type a song or artist..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={disabled}
            autoComplete="off"
          />
          {hasQuery ? (
            <button
              type="button"
              onClick={clearSearch}
              disabled={disabled}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-white/40 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {loading ? (
          <p className="mt-2 text-sm text-white/50">Searching…</p>
        ) : null}
        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
        {addError ? <p className="mt-2 text-sm text-red-400">{addError}</p> : null}
        {addedKey === 'manual' ? (
          <p className="mt-2 text-sm text-[var(--accent)]">Song added to the ranking</p>
        ) : null}
        {!loading && query.trim() && results.length === 0 && !error ? (
          <p className="mt-2 text-sm text-white/50">No tracks found</p>
        ) : null}
      </div>

      {results.length > 0 ? (
        <div className="space-y-2">
          {results.map((track) => {
            const key = trackKey(track)
            const isAdding = addingKey === key
            const wasAdded = addedKey === key

            return (
              <div
                key={`${track.artist}-${track.title}-${track.lastfmUrl ?? ''}`}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
              >
                {track.artworkUrl ? (
                  <img
                    src={track.artworkUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/5 text-xs text-white/30">
                    ♪
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{track.title}</p>
                  <p className="truncate text-sm text-white/60">{track.artist}</p>
                </div>
                <Button
                  size="sm"
                  variant={wasAdded ? 'default' : 'secondary'}
                  disabled={disabled || isAdding || wasAdded}
                  onClick={() => void handleAddTrack(track)}
                >
                  {wasAdded ? (
                    <>
                      <Check className="h-4 w-4" />
                      Added
                    </>
                  ) : isAdding ? (
                    'Adding…'
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
        <p className="mb-3 text-sm font-semibold text-white/80">Manual entry</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Song title"
            value={manualTitle}
            onChange={(event) => setManualTitle(event.target.value)}
            disabled={disabled || manualAdding}
          />
          <Input
            placeholder="Artist"
            value={manualArtist}
            onChange={(event) => setManualArtist(event.target.value)}
            disabled={disabled || manualAdding}
          />
        </div>
        <Button
          className="mt-3"
          variant="secondary"
          disabled={
            disabled || manualAdding || !manualTitle.trim() || !manualArtist.trim()
          }
          onClick={() => void handleManualAdd()}
        >
          {manualAdding ? 'Adding…' : 'Add manually'}
        </Button>
      </div>
    </div>
  )
}
