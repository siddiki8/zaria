export interface ArtworkPalette {
  vibrant: string
  muted: string
  dark: string
}

const paletteCache = new Map<string, ArtworkPalette | null>()
const inflight = new Map<string, Promise<ArtworkPalette | null>>()

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel)))
      .toString(16)
      .padStart(2, '0'))
    .join('')}`
}

function luminance(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

function saturation(r: number, g: number, b: number) {
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const delta = max - min
  if (max === 0) return 0
  return delta / max
}

function extractFromImageData(data: Uint8ClampedArray): ArtworkPalette | null {
  let vibrantScore = -1
  let vibrant = [171, 255, 79]
  let darkScore = -1
  let dark = [20, 20, 20]
  let mutedR = 0
  let mutedG = 0
  let mutedB = 0
  let mutedCount = 0

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!
    const g = data[i + 1]!
    const b = data[i + 2]!
    const a = data[i + 3]!
    if (a < 180) continue

    const lum = luminance(r, g, b)
    if (lum < 0.06 || lum > 0.94) continue

    const sat = saturation(r, g, b)
    mutedR += r
    mutedG += g
    mutedB += b
    mutedCount += 1

    const nextVibrant = sat * (0.35 + lum) * (1 - Math.abs(lum - 0.55))
    if (nextVibrant > vibrantScore) {
      vibrantScore = nextVibrant
      vibrant = [r, g, b]
    }

    const nextDark = sat * (1 - lum)
    if (nextDark > darkScore && lum < 0.45) {
      darkScore = nextDark
      dark = [r, g, b]
    }
  }

  if (mutedCount < 8) return null

  const muted = [
    mutedR / mutedCount,
    mutedG / mutedCount,
    mutedB / mutedCount,
  ]

  return {
    vibrant: rgbToHex(vibrant[0]!, vibrant[1]!, vibrant[2]!),
    muted: rgbToHex(muted[0]!, muted[1]!, muted[2]!),
    dark: rgbToHex(dark[0]!, dark[1]!, dark[2]!),
  }
}

function sampleImage(image: HTMLImageElement): ArtworkPalette | null {
  const canvas = document.createElement('canvas')
  const size = 32
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.drawImage(image, 0, 0, size, size)
  try {
    return extractFromImageData(context.getImageData(0, 0, size, size).data)
  } catch {
    return null
  }
}

export function loadArtworkPalette(url: string): Promise<ArtworkPalette | null> {
  if (paletteCache.has(url)) return Promise.resolve(paletteCache.get(url) ?? null)

  const pending = inflight.get(url)
  if (pending) return pending

  const request = new Promise<ArtworkPalette | null>((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.onload = () => {
      const palette = sampleImage(image)
      paletteCache.set(url, palette)
      inflight.delete(url)
      resolve(palette)
    }
    image.onerror = () => {
      paletteCache.set(url, null)
      inflight.delete(url)
      resolve(null)
    }
    image.src = url
  })

  inflight.set(url, request)
  return request
}
