import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { getDb } from './firebase'
import type { DjSet, Song } from './types'

function mapSet(id: string, data: DocumentData): DjSet {
  return {
    id,
    djId: data.djId,
    djName: data.djName,
    name: data.name,
    slug: data.slug,
    status: data.status,
    startAt: (data.startAt as Timestamp).toDate(),
    timezone: data.timezone,
    durationMinutes: data.durationMinutes,
    createdAt: (data.createdAt as Timestamp).toDate(),
    endedAt: data.endedAt ? (data.endedAt as Timestamp).toDate() : undefined,
  }
}

function mapSong(id: string, data: DocumentData): Song {
  return {
    id,
    title: data.title,
    artist: data.artist,
    artworkUrl: data.artworkUrl,
    lastfmUrl: data.lastfmUrl,
    voteCount: data.voteCount ?? 0,
    played: data.played ?? false,
    playedAt: data.playedAt ? (data.playedAt as Timestamp).toDate() : undefined,
    addedAt: (data.addedAt as Timestamp).toDate(),
  }
}

export async function getSetBySlug(slug: string) {
  const setsRef = collection(getDb(), 'sets')
  const q = query(setsRef, where('slug', '==', slug))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const docSnap = snapshot.docs[0]!
  return mapSet(docSnap.id, docSnap.data())
}

export async function getSetById(setId: string) {
  const docSnap = await getDoc(doc(getDb(), 'sets', setId))
  if (!docSnap.exists()) return null
  return mapSet(docSnap.id, docSnap.data())
}

export function subscribeToSet(setId: string, callback: (set: DjSet | null) => void) {
  return onSnapshot(doc(getDb(), 'sets', setId), (docSnap) => {
    if (!docSnap.exists()) {
      callback(null)
      return
    }
    callback(mapSet(docSnap.id, docSnap.data()))
  })
}

export function subscribeToDjSets(djId: string, callback: (sets: DjSet[]) => void) {
  const q = query(
    collection(getDb(), 'sets'),
    where('djId', '==', djId),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((docSnap) => mapSet(docSnap.id, docSnap.data())))
  })
}

export function subscribeToActiveSongs(
  setId: string,
  callback: (songs: Song[]) => void,
  onError?: (error: Error) => void,
) {
  const q = query(
    collection(getDb(), 'sets', setId, 'songs'),
    where('played', '==', false),
  )
  return onSnapshot(
    q,
    (snapshot) => {
      const songs = snapshot.docs.map((docSnap) => mapSong(docSnap.id, docSnap.data()))
      songs.sort((a, b) => b.voteCount - a.voteCount)
      callback(songs)
    },
    (error) => onError?.(error),
  )
}

export function subscribeToPlayedSongs(
  setId: string,
  callback: (songs: Song[]) => void,
  onError?: (error: Error) => void,
) {
  const q = query(
    collection(getDb(), 'sets', setId, 'songs'),
    where('played', '==', true),
  )
  return onSnapshot(
    q,
    (snapshot) => {
      const songs = snapshot.docs.map((docSnap) => mapSong(docSnap.id, docSnap.data()))
      songs.sort((a, b) => {
        const aTime = a.playedAt?.getTime() ?? 0
        const bTime = b.playedAt?.getTime() ?? 0
        return bTime - aTime
      })
      callback(songs)
    },
    (error) => onError?.(error),
  )
}

export async function createSet(input: {
  djId: string
  djName: string
  name: string
  slug: string
  status: DjSet['status']
  startAt: Date
  timezone: string
  durationMinutes: number
}) {
  const setRef = doc(collection(getDb(), 'sets'))
  await setDoc(setRef, {
    djId: input.djId,
    djName: input.djName,
    name: input.name,
    slug: input.slug,
    status: input.status,
    startAt: Timestamp.fromDate(input.startAt),
    timezone: input.timezone,
    durationMinutes: input.durationMinutes,
    createdAt: serverTimestamp(),
  })
  return setRef.id
}

export async function endSet(setId: string) {
  await updateDoc(doc(getDb(), 'sets', setId), {
    status: 'ended',
    endedAt: serverTimestamp(),
  })
}

export async function extendSetDuration(setId: string, minutes: number) {
  await updateDoc(doc(getDb(), 'sets', setId), {
    durationMinutes: increment(minutes),
  })
}

export async function addSong(
  setId: string,
  song: {
    title: string
    artist: string
    artworkUrl?: string
    lastfmUrl?: string
  },
) {
  const songRef = doc(collection(getDb(), 'sets', setId, 'songs'))
  await setDoc(songRef, {
    title: song.title,
    artist: song.artist,
    artworkUrl: song.artworkUrl ?? null,
    lastfmUrl: song.lastfmUrl ?? null,
    voteCount: 0,
    played: false,
    addedAt: serverTimestamp(),
  })
  return songRef.id
}

export async function removeSong(setId: string, songId: string) {
  await deleteDoc(doc(getDb(), 'sets', setId, 'songs', songId))
}

export async function markSongPlayed(setId: string, songId: string) {
  await updateDoc(doc(getDb(), 'sets', setId, 'songs', songId), {
    played: true,
    playedAt: serverTimestamp(),
  })
}

export async function getVotedSongIds(setId: string, voterId: string) {
  const songsSnapshot = await getDocs(collection(getDb(), 'sets', setId, 'songs'))
  const voted = new Set<string>()

  await Promise.all(
    songsSnapshot.docs.map(async (songDoc) => {
      const voteDoc = await getDoc(
        doc(getDb(), 'sets', setId, 'songs', songDoc.id, 'votes', voterId),
      )
      if (voteDoc.exists()) voted.add(songDoc.id)
    }),
  )

  return voted
}

export function subscribeToVotedSongIds(
  setId: string,
  voterId: string,
  callback: (votedIds: Set<string>) => void,
) {
  const songsRef = collection(getDb(), 'sets', setId, 'songs')
  return onSnapshot(songsRef, async (snapshot) => {
    const voted = new Set<string>()
    await Promise.all(
      snapshot.docs.map(async (songDoc) => {
        const voteDoc = await getDoc(
          doc(getDb(), 'sets', setId, 'songs', songDoc.id, 'votes', voterId),
        )
        if (voteDoc.exists()) voted.add(songDoc.id)
      }),
    )
    callback(voted)
  })
}

export async function toggleVote(setId: string, songId: string, voterId: string) {
  const songRef = doc(getDb(), 'sets', setId, 'songs', songId)
  const voteRef = doc(getDb(), 'sets', setId, 'songs', songId, 'votes', voterId)

  await runTransaction(getDb(), async (transaction) => {
    const voteSnap = await transaction.get(voteRef)
    const songSnap = await transaction.get(songRef)

    if (!songSnap.exists()) {
      throw new Error('Song not found')
    }

    if (voteSnap.exists()) {
      transaction.delete(voteRef)
      transaction.update(songRef, { voteCount: increment(-1) })
    } else {
      transaction.set(voteRef, { createdAt: serverTimestamp() })
      transaction.update(songRef, { voteCount: increment(1) })
    }
  })
}
