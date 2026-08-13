import { HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { AuthProvider } from '@/contexts/auth-context'
import appCss from '../styles.css?url'

function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="display-font text-5xl text-white">404</h1>
        <p className="mt-3 text-white/60">This page does not exist.</p>
        <Link
          to="/"
          className="mt-6 inline-block text-sm text-[var(--accent)] hover:underline"
        >
          Back to home
        </Link>
      </div>
    </main>
  )
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      { title: 'What Should Play? — Live crowd voting' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }),
  notFoundComponent: NotFoundPage,
  component: RootComponent,
})

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  )
}
