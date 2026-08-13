import { createFileRoute, notFound } from '@tanstack/react-router'
import { PublicVotingPage } from '@/components/public-voting-page'
import { buildSetPageHead } from '@/lib/set-meta'
import { getSetByPublicPath } from '@/lib/sets'

export const Route = createFileRoute('/s/$djSlug/$setSlug')({
  ssr: false,
  loader: async ({ params }) => {
    const set = await getSetByPublicPath(params.djSlug, params.setSlug)
    if (!set) throw notFound()
    return { set }
  },
  head: ({ loaderData }) => {
    if (!loaderData?.set) return { meta: [{ title: 'What Should Play?' }] }
    return buildSetPageHead(loaderData.set)
  },
  component: PublicSetByPathPage,
  notFoundComponent: () => (
    <main className="flex min-h-screen items-center justify-center text-white/60">
      Set not found.
    </main>
  ),
})

function PublicSetByPathPage() {
  const { set } = Route.useLoaderData()
  return <PublicVotingPage initialSet={set} />
}
