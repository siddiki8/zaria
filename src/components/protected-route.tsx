import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/contexts/auth-context'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const isDj = Boolean(user && !user.isAnonymous)

  useEffect(() => {
    if (!loading && !isDj) {
      void navigate({ to: '/login' })
    }
  }, [isDj, loading, navigate])

  if (loading) {
    return (
      <div className="app-loader" role="status">
        <p>Checking your session…</p>
      </div>
    )
  }

  if (!isDj) return null

  return <>{children}</>
}
