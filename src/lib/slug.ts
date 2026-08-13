/** Lowercase URL slug from display text (e.g. "DJ Afterglow" → "dj-afterglow"). */
export function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
  return slug || 'set'
}

/** Next available slug: base, base-2, base-3, … */
export function nextAvailableSlug(base: string, taken: Set<string>): string {
  const normalized = slugify(base)
  if (!taken.has(normalized)) return normalized
  let n = 2
  while (taken.has(`${normalized}-${n}`)) n += 1
  return `${normalized}-${n}`
}
