import { useEffect, useState } from 'react'
import {
  loadArtworkPalette,
  type ArtworkPalette,
} from '@/lib/artwork-palette'

export function useArtworkPalette(url?: string) {
  const [palette, setPalette] = useState<ArtworkPalette | null>(null)

  useEffect(() => {
    if (!url) {
      setPalette(null)
      return
    }

    let cancelled = false
    setPalette(null)
    void loadArtworkPalette(url).then((next) => {
      if (!cancelled) setPalette(next)
    })

    return () => {
      cancelled = true
    }
  }, [url])

  return palette
}
