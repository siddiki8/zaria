import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import {
  onDocumentWritten,
  type FirestoreEvent,
  type Change,
} from 'firebase-functions/v2/firestore'

initializeApp()

const SHARD_COUNT = 10

function shardIndex(uid: string): number {
  let hash = 0
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % SHARD_COUNT
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

async function songIsActive(
  db: FirebaseFirestore.Firestore,
  setId: string,
  songId: string,
): Promise<boolean> {
  const snap = await db.doc(`sets/${setId}/songs/${songId}`).get()
  if (!snap.exists) return false
  return snap.data()?.played === false
}

async function applyShardDelta(
  db: FirebaseFirestore.Firestore,
  setId: string,
  songId: string,
  uid: string,
  delta: number,
) {
  if (delta === 0) return
  if (!(await songIsActive(db, setId, songId))) return

  const shard = shardIndex(uid)
  const shardRef = db.doc(`sets/${setId}/songs/${songId}/shards/${shard}`)
  await shardRef.set({ count: FieldValue.increment(delta) }, { merge: true })
  await flushVoteCount(db, setId, songId)
}

async function flushVoteCount(
  db: FirebaseFirestore.Firestore,
  setId: string,
  songId: string,
) {
  const songRef = db.doc(`sets/${setId}/songs/${songId}`)

  await db.runTransaction(async (transaction) => {
    const songSnap = await transaction.get(songRef)
    if (!songSnap.exists) return

    const shardRefs = Array.from({ length: SHARD_COUNT }, (_, i) =>
      db.doc(`sets/${setId}/songs/${songId}/shards/${i}`),
    )
    const shardSnaps = await transaction.getAll(...shardRefs)

    let total = 0
    for (const shardSnap of shardSnaps) {
      total += (shardSnap.data()?.count as number | undefined) ?? 0
    }

    transaction.update(songRef, {
      voteCount: total,
    })
  })
}

export const onBallotWrite = onDocumentWritten(
  'sets/{setId}/ballots/{uid}',
  async (event: FirestoreEvent<Change<FirebaseFirestore.DocumentSnapshot> | undefined>) => {
    const setId = event.params.setId
    const uid = event.params.uid
    const change = event.data
    if (!change) return

    const beforeIds = new Set(asStringArray(change.before.data()?.songIds))
    const afterIds = new Set(asStringArray(change.after.data()?.songIds))

    const added = [...afterIds].filter((id) => !beforeIds.has(id))
    const removed = [...beforeIds].filter((id) => !afterIds.has(id))

    const db = getFirestore()

    await Promise.all([
      ...added.map((songId) => applyShardDelta(db, setId, songId, uid, 1)),
      ...removed.map((songId) => applyShardDelta(db, setId, songId, uid, -1)),
    ])
  },
)
