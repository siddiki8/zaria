import type { DjSet } from './types'
import { getPublicSetUrl } from './utils'

export function buildSetPageTitle(set: Pick<DjSet, 'name' | 'djName'>): string {
  return `${set.name} — ${set.djName}`
}

export function buildSetPageDescription(
  set: Pick<DjSet, 'name' | 'djName'>,
): string {
  return `Vote for the next track at ${set.djName}'s set ${set.name}`
}

export function buildSetPageHead(
  set: Pick<DjSet, 'name' | 'djName' | 'slug' | 'djSlug' | 'setSlug'>,
  origin?: string,
) {
  const title = buildSetPageTitle(set)
  const description = buildSetPageDescription(set)
  const path = getPublicSetUrl(set)
  const url =
    origin && typeof origin === 'string'
      ? `${origin.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
      : path

  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ],
  }
}
