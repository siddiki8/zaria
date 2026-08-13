import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore'
import { getDb, isFirebaseClient } from './firebase'
import { slugify } from './slug'
import type { UserProfile } from './types'

function mapUserProfile(id: string, data: DocumentData): UserProfile {
  return {
    id,
    djName: typeof data.djName === 'string' ? data.djName : '',
    djSlug: typeof data.djSlug === 'string' ? data.djSlug : undefined,
    displayName: data.displayName,
    photoURL: data.photoURL,
    createdAt: (data.createdAt as Timestamp).toDate(),
  }
}

export function subscribeToUserProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void,
) {
  if (!isFirebaseClient()) return () => {}

  return onSnapshot(doc(getDb(), 'users', uid), (snapshot) => {
    if (!snapshot.exists()) {
      onChange(null)
      return
    }
    onChange(mapUserProfile(snapshot.id, snapshot.data()))
  })
}

export async function ensureUserProfile(
  uid: string,
  data: { displayName?: string | null; photoURL?: string | null },
) {
  const userRef = doc(getDb(), 'users', uid)
  const snapshot = await getDoc(userRef)
  if (snapshot.exists()) return

  await setDoc(userRef, {
    djName: '',
    displayName: data.displayName ?? null,
    photoURL: data.photoURL ?? null,
    createdAt: serverTimestamp(),
  })
}

async function getDjSlugOwner(djSlug: string): Promise<string | null> {
  const snap = await getDoc(doc(getDb(), 'djSlugs', djSlug))
  if (!snap.exists()) return null
  const uid = snap.data().uid
  return typeof uid === 'string' ? uid : null
}

async function allocateDjSlug(djName: string, uid: string) {
  const base = slugify(djName)
  const candidates: string[] = [base]
  for (let n = 2; n <= 50; n++) candidates.push(`${base}-${n}`)

  for (const candidate of candidates) {
    const owner = await getDjSlugOwner(candidate)
    if (owner === null || owner === uid) return candidate
  }

  throw new Error('Could not allocate a unique DJ URL. Try a different name.')
}

export async function saveDjProfile(uid: string, djName: string) {
  const trimmed = djName.trim()
  if (!trimmed) throw new Error('Enter your DJ name')

  const userRef = doc(getDb(), 'users', uid)
  const userSnap = await getDoc(userRef)
  const previousDjSlug =
    userSnap.exists() && typeof userSnap.data().djSlug === 'string'
      ? userSnap.data().djSlug
      : undefined

  const djSlug = await allocateDjSlug(trimmed, uid)

  await runTransaction(getDb(), async (transaction) => {
    const slugRef = doc(getDb(), 'djSlugs', djSlug)
    const slugSnap = await transaction.get(slugRef)

    if (slugSnap.exists() && slugSnap.data().uid !== uid) {
      throw new Error('That DJ URL is already taken. Try a different name.')
    }

    transaction.set(slugRef, { uid })

    if (previousDjSlug && previousDjSlug !== djSlug) {
      const oldRef = doc(getDb(), 'djSlugs', previousDjSlug)
      const oldSnap = await transaction.get(oldRef)
      if (oldSnap.exists() && oldSnap.data().uid === uid) {
        transaction.delete(oldRef)
      }
    }

    transaction.update(userRef, { djName: trimmed, djSlug })
  })

  const setsSnap = await getDocs(
    query(collection(getDb(), 'sets'), where('djId', '==', uid)),
  )

  if (!setsSnap.empty) {
    const batch = writeBatch(getDb())
    for (const setDoc of setsSnap.docs) {
      batch.update(setDoc.ref, { djName: trimmed, djSlug })
    }
    await batch.commit()
  }

  return { djName: trimmed, djSlug }
}

export async function updateDjName(uid: string, djName: string) {
  await saveDjProfile(uid, djName)
}

export async function getUserDjSlug(uid: string): Promise<string | undefined> {
  const snap = await getDoc(doc(getDb(), 'users', uid))
  if (!snap.exists()) return undefined
  const djSlug = snap.data().djSlug
  return typeof djSlug === 'string' ? djSlug : undefined
}
