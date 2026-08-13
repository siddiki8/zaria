import { useEffect, useState } from 'react'
import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { Copy, QrCode } from 'lucide-react'
import { ProtectedRoute } from '@/components/protected-route'
import { LiveIndicator } from '@/components/live-indicator'
import { QrModal } from '@/components/qr-modal'
import { SetTabs } from '@/components/set-tabs'
import { SetTheme } from '@/components/set-theme'
import { SetTimer } from '@/components/set-timer'
import { Button } from '@/components/ui/button'
import { SetProvider } from '@/contexts/set-context'
import { useAuth } from '@/contexts/auth-context'
import { subscribeToSet, getSetById } from '@/lib/sets'
import { getPublicSetUrl, getSetDisplayStatus } from '@/lib/utils'
import { buildSetPageTitle } from '@/lib/set-meta'
import type { DjSet } from '@/lib/types'

export const Route = createFileRoute('/sets/$setId')({
  ssr: false,
  loader: async ({ params }) => {
    const set = await getSetById(params.setId)
    return { set }
  },
  head: ({ loaderData }) => {
    if (!loaderData?.set) return { meta: [{ title: 'What Should Play?' }] }
    return { meta: [{ title: buildSetPageTitle(loaderData.set) }] }
  },
  component: SetLayoutPage,
})

function SetLayoutPage() {
  const { setId } = Route.useParams()
  const { user } = useAuth()
  const [djSet, setDjSet] = useState<DjSet | null>(null)
  const [qrOpen, setQrOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => subscribeToSet(setId, setDjSet), [setId])

  if (!djSet) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center text-white/60">
          Loading set...
        </div>
      </ProtectedRoute>
    )
  }

  if (user && djSet.djId !== user.uid) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center text-white/60">
          You do not have access to this set.
        </div>
      </ProtectedRoute>
    )
  }

  const publicUrl = getPublicSetUrl(djSet)
  const displayStatus = getSetDisplayStatus(djSet)
  const ended = displayStatus === 'ended'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setActionError(
        'Could not copy the link. Select and copy the URL from the QR code instead.',
      )
    }
  }

  return (
    <ProtectedRoute>
      <SetTheme set={djSet}>
        <SetProvider
          value={{
            setId,
            djSet,
            publicUrl,
            displayStatus,
            ended,
            qrOpen,
            setQrOpen,
            copied,
            handleCopy,
            actionError,
            setActionError,
          }}
        >
          <main className="min-h-screen py-8">
            <div className="page-shell space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link
                    to="/dashboard"
                    className="text-sm text-white/60 hover:text-white"
                  >
                    ← Dashboard
                  </Link>
                  <h1 className="mt-2 text-3xl font-bold text-white">
                    {djSet.name}
                  </h1>
                  <div className="mt-3">
                    <LiveIndicator status={displayStatus} />
                  </div>
                  <div className="mt-4 max-w-sm">
                    <SetTimer set={djSet} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => void handleCopy()}
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? 'Copied!' : 'Copy link'}
                  </Button>
                  <Button variant="secondary" onClick={() => setQrOpen(true)}>
                    <QrCode className="h-4 w-4" />
                    QR code
                  </Button>
                </div>
              </div>

              {actionError ? (
                <p className="text-sm text-red-300" role="alert">
                  {actionError}
                </p>
              ) : null}

              <SetTabs setId={setId} />
              <Outlet />
            </div>
          </main>

          <QrModal
            open={qrOpen}
            onClose={() => setQrOpen(false)}
            url={publicUrl}
          />
        </SetProvider>
      </SetTheme>
    </ProtectedRoute>
  )
}
