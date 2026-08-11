import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore'
import { getDb } from './firebase'
import type { UserProfile } from './types'

function mapUserProfile(id: string, data: DocumentData): UserProfile {
  return {
    id,
    djName: typeof data.djName === 'string' ? data.djName : '',
    displayName: data.displayName,
    photoURL: data.photoURL,
    createdAt: (data.createdAt as Timestamp).toDate(),
  }
}

export function subscribeToUserProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void,
) {
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

export async function updateDjName(uid: string, djName: string) {
  await updateDoc(doc(getDb(), 'users', uid), { djName: djName.trim() })
}
