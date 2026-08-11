import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/contexts/auth-context'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: '/login' })
    }
  }, [loading, navigate, user])

  if (loading) {
    return (
      <div className="app-loader" role="status">
        <p>Checking your session…</p>
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}
