export type SetStatus = 'scheduled' | 'live' | 'ended'

export interface DjSet {
  id: string
  djId: string
  djName: string
  name: string
  slug: string
  status: SetStatus
  startAt: Date
  timezone: string
  durationMinutes: number
  createdAt: Date
  endedAt?: Date
}

export interface Song {
  id: string
  title: string
  artist: string
  artworkUrl?: string
  lastfmUrl?: string
  voteCount: number
  played: boolean
  playedAt?: Date
  addedAt: Date
}

export interface LastFmTrackResult {
  title: string
  artist: string
  artworkUrl?: string
  lastfmUrl?: string
}

export interface UserProfile {
  id: string
  djName: string
  displayName?: string
  photoURL?: string
  createdAt: Date
}
