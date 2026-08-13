import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'
import { getAuthClient, isFirebaseConfigured } from '@/lib/firebase'

/**
 * Ensures a Firebase Auth session exists for public voting.
 * Reuses an existing Google DJ session; otherwise signs in anonymously.
 */
export function useAnonymousVoterAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false)
      setError('Voting is not configured.')
      return
    }

    const auth = getAuthClient()
    let cancelled = false

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (cancelled) return

      if (currentUser) {
        setUser(currentUser)
        setError(null)
        setLoading(false)
        return
      }

      void signInAnonymously(auth)
        .then((credential) => {
          if (cancelled) return
          setUser(credential.user)
          setError(null)
        })
        .catch((err: unknown) => {
          if (cancelled) return
          setError(
            err instanceof Error
              ? err.message
              : 'Could not start voting session.',
          )
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return { user, loading, error, uid: user?.uid ?? null }
}
