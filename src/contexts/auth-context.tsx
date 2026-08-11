import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { getAuthClient, googleProvider, isFirebaseConfigured } from '@/lib/firebase'
import { ensureUserProfile, subscribeToUserProfile, updateDjName } from '@/lib/users'
import type { UserProfile } from '@/lib/types'

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  saveDjName: (djName: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function createProfileIfNeeded(user: User) {
  await ensureUserProfile(user.uid, {
    displayName: user.displayName,
    photoURL: user.photoURL,
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false)
      return
    }

    return onAuthStateChanged(getAuthClient(), async (nextUser) => {
      if (nextUser) {
        await createProfileIfNeeded(nextUser)
      }
      setUser(nextUser)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    return subscribeToUserProfile(user.uid, setProfile)
  }, [user])

  const signInWithGoogle = async () => {
    await signInWithPopup(getAuthClient(), googleProvider)
  }

  const logout = async () => {
    await signOut(getAuthClient())
  }

  const saveDjName = async (djName: string) => {
    if (!user) return
    await updateDjName(user.uid, djName)
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signInWithGoogle, logout, saveDjName }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
