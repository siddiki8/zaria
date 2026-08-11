import { useEffect } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { isFirebaseConfigured } from '@/lib/firebase'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      void navigate({ to: '/dashboard' })
    }
  }, [loading, navigate, user])

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8 glow-purple">
        <Link to="/" className="display-font text-4xl text-white">
          ZARIA
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-white">DJ sign in</h1>
        <p className="mt-2 text-sm text-white/60">
          Sign in with Google to create sets and manage live voting.
        </p>
        {!isFirebaseConfigured() ? (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            Firebase is not configured yet. Copy <code>.env.example</code> to{' '}
            <code>.env.local</code> and add your Firebase web app config.
          </p>
        ) : null}
        <Button
          className="mt-8 w-full"
          size="lg"
          onClick={() => void signInWithGoogle()}
          disabled={loading || !isFirebaseConfigured()}
        >
          Continue with Google
        </Button>
      </div>
    </main>
  )
}
