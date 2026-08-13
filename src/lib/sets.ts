import {
  arrayUnion,
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
  writeBatch,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { getDb, isFirebaseClient } from './firebase'
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
} from './set-theme'
import { nextAvailableSlug, slugify } from './slug'
import type { DjSet, Song } from './types'

function mapSet(id: string, data: DocumentData): DjSet {
  return {
    id,
    djId: data.djId,
    djName: data.djName,
    djSlug: typeof data.djSlug === 'string' ? data.djSlug : undefined,
    name: data.name,
    setSlug: typeof data.setSlug === 'string' ? data.setSlug : undefined,
    slug: data.slug,
    status: data.status,
    startAt: (data.startAt as Timestamp).toDate(),
    timezone: data.timezone,
    durationMinutes: data.durationMinutes,
    primaryColor: data.primaryColor ?? DEFAULT_PRIMARY_COLOR,
    secondaryColor: data.secondaryColor ?? DEFAULT_SECONDARY_COLOR,
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

export async function getSetByPublicPath(djSlug: string, setSlug: string) {
  const setsRef = collection(getDb(), 'sets')
  const q = query(
    setsRef,
    where('djSlug', '==', djSlug),
    where('setSlug', '==', setSlug),
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const docSnap = snapshot.docs[0]!
  return mapSet(docSnap.id, docSnap.data())
}

export async function allocateSetSlug(djId: string, setName: string) {
  const userSnap = await getDoc(doc(getDb(), 'users', djId))
  const taken = new Set<string>()
  if (userSnap.exists()) {
    const setSlugs = userSnap.data().setSlugs
    if (Array.isArray(setSlugs)) {
      for (const slug of setSlugs) {
        if (typeof slug === 'string') taken.add(slug)
      }
    }
  }
  return nextAvailableSlug(setName, taken)
}

export async function backfillSetSlugsForDj(
  djId: string,
  djSlug: string,
  djName: string,
) {
  const setsSnap = await getDocs(
    query(collection(getDb(), 'sets'), where('djId', '==', djId)),
  )
  const taken = new Set<string>()
  for (const docSnap of setsSnap.docs) {
    const setSlug = docSnap.data().setSlug
    if (typeof setSlug === 'string') taken.add(setSlug)
  }

  const batch = writeBatch(getDb())
  let pending = 0

  for (const docSnap of setsSnap.docs) {
    const data = docSnap.data()
    const needsDjSlug = data.djSlug !== djSlug || data.djName !== djName
    const needsSetSlug = typeof data.setSlug !== 'string'
    if (!needsDjSlug && !needsSetSlug) continue

    const setSlug =
      typeof data.setSlug === 'string'
        ? data.setSlug
        : nextAvailableSlug(data.name ?? slugify('set'), taken)

    if (!taken.has(setSlug)) taken.add(setSlug)

    batch.update(docSnap.ref, {
      djSlug,
      djName,
      setSlug,
    })
    pending += 1
  }

  if (pending > 0) await batch.commit()

  const allSlugs = [...taken]
  if (allSlugs.length > 0) {
    await updateDoc(doc(getDb(), 'users', djId), { setSlugs: allSlugs })
  }
}

export async function getSetById(setId: string) {
  const docSnap = await getDoc(doc(getDb(), 'sets', setId))
  if (!docSnap.exists()) return null
  return mapSet(docSnap.id, docSnap.data())
}

function noopUnsubscribe() {}

export function subscribeToSet(setId: string, callback: (set: DjSet | null) => void) {
  if (!isFirebaseClient()) return noopUnsubscribe

  return onSnapshot(doc(getDb(), 'sets', setId), (docSnap) => {
    if (!docSnap.exists()) {
      callback(null)
      return
    }
    callback(mapSet(docSnap.id, docSnap.data()))
  })
}

export function subscribeToDjSets(djId: string, callback: (sets: DjSet[]) => void) {
  if (!isFirebaseClient()) return noopUnsubscribe

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
  if (!isFirebaseClient()) return noopUnsubscribe

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
  if (!isFirebaseClient()) return noopUnsubscribe

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
  djSlug: string
  name: string
  slug: string
  setSlug: string
  status: DjSet['status']
  startAt: Date
  timezone: string
  durationMinutes: number
  primaryColor?: string
  secondaryColor?: string
}) {
  const setRef = doc(collection(getDb(), 'sets'))
  await setDoc(setRef, {
    djId: input.djId,
    djName: input.djName,
    djSlug: input.djSlug,
    name: input.name,
    slug: input.slug,
    setSlug: input.setSlug,
    status: input.status,
    startAt: Timestamp.fromDate(input.startAt),
    timezone: input.timezone,
    durationMinutes: input.durationMinutes,
    primaryColor: input.primaryColor ?? DEFAULT_PRIMARY_COLOR,
    secondaryColor: input.secondaryColor ?? DEFAULT_SECONDARY_COLOR,
    createdAt: serverTimestamp(),
  })

  await updateDoc(doc(getDb(), 'users', input.djId), {
    setSlugs: arrayUnion(input.setSlug),
  })

  return setRef.id
}

export async function updateSet(
  setId: string,
  patch: Partial<
    Pick<DjSet, 'name' | 'primaryColor' | 'secondaryColor'>
  >,
) {
  await updateDoc(doc(getDb(), 'sets', setId), patch)
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

export function subscribeToBallot(
  setId: string,
  uid: string,
  callback: (votedIds: Set<string>) => void,
) {
  if (!isFirebaseClient()) return noopUnsubscribe

  return onSnapshot(doc(getDb(), 'sets', setId, 'ballots', uid), (snap) => {
    if (!snap.exists()) {
      callback(new Set())
      return
    }
    const songIds = snap.data().songIds
    callback(
      new Set(
        Array.isArray(songIds)
          ? songIds.filter((id): id is string => typeof id === 'string')
          : [],
      ),
    )
  })
}

export async function toggleVote(setId: string, songId: string, uid: string) {
  const ballotRef = doc(getDb(), 'sets', setId, 'ballots', uid)
  const songRef = doc(getDb(), 'sets', setId, 'songs', songId)

  await runTransaction(getDb(), async (transaction) => {
    const ballotSnap = await transaction.get(ballotRef)
    const songSnap = await transaction.get(songRef)

    if (!songSnap.exists() || songSnap.data().played === true) {
      throw new Error('This song is no longer available for voting.')
    }

    const currentIds: string[] = ballotSnap.exists()
      ? (ballotSnap.data().songIds ?? []).filter(
          (id: unknown): id is string => typeof id === 'string',
        )
      : []

    const hasVote = currentIds.includes(songId)
    const nextIds = hasVote
      ? currentIds.filter((id) => id !== songId)
      : [...currentIds, songId]

    if (nextIds.length > 50) {
      throw new Error('You can vote for at most 50 songs at once.')
    }

    const delta = hasVote ? -1 : 1
    transaction.set(ballotRef, {
      songIds: nextIds,
      lastSongId: songId,
      lastDelta: delta,
    })
    transaction.update(songRef, { voteCount: increment(delta) })
  })
}
