import { useLayoutEffect, useRef } from 'react'

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * FLIP-animates list items when their order/position changes.
 * Pair with register(id) as a callback ref on each row.
 */
export function useFlipList(ids: string[]) {
  const nodes = useRef(new Map<string, HTMLElement>())
  const prevRects = useRef(new Map<string, DOMRect>())
  const ready = useRef(false)
  const idsKey = ids.join('\0')

  const register = (id: string) => (node: HTMLElement | null) => {
    if (node) nodes.current.set(id, node)
    else nodes.current.delete(id)
  }

  useLayoutEffect(() => {
    const idList = idsKey ? idsKey.split('\0') : []
    const nextRects = new Map<string, DOMRect>()

    for (const id of idList) {
      const el = nodes.current.get(id)
      if (!el) continue
      nextRects.set(id, el.getBoundingClientRect())
    }

    if (ready.current && !prefersReducedMotion()) {
      for (const id of idList) {
        const el = nodes.current.get(id)
        const prev = prevRects.current.get(id)
        const next = nextRects.get(id)
        if (!el || !prev || !next) continue

        const dy = prev.top - next.top
        if (Math.abs(dy) < 1) continue

        el.animate(
          [
            { transform: `translateY(${dy}px)` },
            { transform: 'translateY(0)' },
          ],
          { duration: 480, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
        )
      }
    }

    prevRects.current = nextRects
    ready.current = true
  }, [idsKey])

  return { register }
}
