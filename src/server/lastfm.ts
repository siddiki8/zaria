import { createServerFn } from '@tanstack/react-start'
import type { LastFmTrackResult } from '@/lib/types'
import { getFirebaseWebApiKey } from '@/server/firebase-env'

interface LastFmImage {
  '#text': string
  size: string
}

interface LastFmTrack {
  name: string
  artist: string
  url: string
  image?: LastFmImage[]
}

/** Last.fm placeholder "white star" asset — treat as missing art. */
const LASTFM_PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f'

const SEARCH_CACHE_TTL_MS = 60_000
const searchCache = new Map<
  string,
  { tracks: LastFmTrackResult[]; expiresAt: number }
>()

function pickArtwork(images?: LastFmImage[]) {
  if (!images?.length) return undefined
  const preferred = ['extralarge', 'large', 'medium', 'small']
  for (const size of preferred) {
    const match = images.find((image) => image.size === size && image['#text'])
    const url = match?.['#text']
    if (url && !url.includes(LASTFM_PLACEHOLDER)) return url
  }
  return undefined
}

function normalizeTracks(tracks: LastFmTrack[] | LastFmTrack | undefined): LastFmTrackResult[] {
  if (!tracks) return []
  const list = Array.isArray(tracks) ? tracks : [tracks]
  return list.map((track) => ({
    title: track.name,
    artist: track.artist,
    artworkUrl: pickArtwork(track.image),
    lastfmUrl: track.url,
  }))
}

async function assertDjIdToken(idToken: string) {
  const apiKey = getFirebaseWebApiKey()
  if (!apiKey) {
    throw new Error(
      'Firebase API key is not configured on the server. Add FIREBASE_WEB_API_KEY to .dev.vars (same value as VITE_FIREBASE_API_KEY).',
    )
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  )

  if (!response.ok) {
    throw new Error('DJ sign-in required')
  }

  const payload = (await response.json()) as {
    users?: Array<{
      providerUserInfo?: Array<{ providerId?: string }>
    }>
  }

  const user = payload.users?.[0]
  if (!user) throw new Error('DJ sign-in required')

  const providers = user.providerUserInfo ?? []
  const isAnonymous =
    providers.length === 0 ||
    providers.every((provider) => provider.providerId === 'anonymous')

  if (isAnonymous) {
    throw new Error('DJ sign-in required')
  }
}

async function fetchDeezerArtwork(artist: string, title: string) {
  const term = encodeURIComponent(`${artist} ${title}`)
  try {
    const response = await fetch(
      `https://api.deezer.com/search/track?q=${term}&limit=1`,
    )
    if (!response.ok) return undefined

    const payload = (await response.json()) as {
      data?: Array<{
        album?: {
          cover_medium?: string
          cover_big?: string
          cover_xl?: string
        }
      }>
    }
    const album = payload.data?.[0]?.album
    return album?.cover_big || album?.cover_xl || album?.cover_medium || undefined
  } catch {
    return undefined
  }
}

async function fetchItunesArtwork(artist: string, title: string) {
  const term = encodeURIComponent(`${artist} ${title}`)
  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${term}&entity=song&limit=1`,
    )
    if (!response.ok) return undefined

    const payload = (await response.json()) as {
      results?: Array<{ artworkUrl100?: string }>
    }
    const artwork = payload.results?.[0]?.artworkUrl100
    if (!artwork) return undefined
    return artwork.replace('100x100bb', '300x300bb').replace('100x100', '300x300')
  } catch {
    return undefined
  }
}

async function resolveArtwork(artist: string, title: string) {
  return (
    (await fetchDeezerArtwork(artist, title)) ||
    (await fetchItunesArtwork(artist, title))
  )
}

async function enrichArtwork(tracks: LastFmTrackResult[]) {
  return Promise.all(
    tracks.map(async (track) => {
      if (track.artworkUrl) return track
      const artworkUrl = await resolveArtwork(track.artist, track.title)
      return artworkUrl ? { ...track, artworkUrl } : track
    }),
  )
}

export const searchTracks = createServerFn({ method: 'POST' })
  .validator((data: { q: string; idToken: string }) => data)
  .handler(async ({ data }) => {
    await assertDjIdToken(data.idToken)

    const apiKey = process.env.LASTFM_API_KEY
    if (!apiKey) {
      throw new Error('LASTFM_API_KEY is not configured')
    }

    const query = data.q.trim()
    if (!query) return []

    const cacheKey = query.toLowerCase()
    const cached = searchCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.tracks
    }

    const params = new URLSearchParams({
      method: 'track.search',
      track: query,
      api_key: apiKey,
      format: 'json',
      limit: '12',
    })

    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?${params.toString()}`,
    )

    if (!response.ok) {
      throw new Error('Failed to search Last.fm')
    }

    const payload = (await response.json()) as {
      results?: {
        trackmatches?: {
          track?: LastFmTrack[] | LastFmTrack
        }
      }
    }

    const tracks = await enrichArtwork(
      normalizeTracks(payload.results?.trackmatches?.track),
    )

    searchCache.set(cacheKey, {
      tracks,
      expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    })

    return tracks
  })
