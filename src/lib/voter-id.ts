import { nanoid } from 'nanoid'

const VOTER_ID_KEY = 'zaria-voter-id'

export function getVoterId() {
  if (typeof window === 'undefined') return ''

  let voterId = localStorage.getItem(VOTER_ID_KEY)
  if (!voterId) {
    voterId = nanoid(16)
    localStorage.setItem(VOTER_ID_KEY, voterId)
  }
  return voterId
}
