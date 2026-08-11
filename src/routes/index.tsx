import { Link, createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { user } = useAuth()

  return (
    <main className="min-h-screen">
      <div className="page-shell flex min-h-screen flex-col justify-center py-16">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
          Live crowd voting
        </p>
        <h1 className="display-font mb-6 text-[clamp(3.5rem,15vw,8rem)] leading-[0.9] text-white">
          What Should Play?
        </h1>
        <p className="mb-10 max-w-xl text-lg text-white/70">
          Build your set, share a QR code, and let the crowd vote for what they
          want to hear next.
        </p>
        <div className="flex flex-wrap gap-3">
          {user ? (
            <Link to="/dashboard">
              <Button size="lg">Go to dashboard</Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button size="lg">DJ sign in</Button>
            </Link>
          )}
        </div>
        <p className="mt-12 text-xs font-medium tracking-[0.28em] text-white/20">
          ZARIA // 01
        </p>
      </div>
    </main>
  )
}
