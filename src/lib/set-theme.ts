import type { CSSProperties } from 'react'

export const DEFAULT_PRIMARY_COLOR = '#abff4f'
export const DEFAULT_SECONDARY_COLOR = '#8b5cf6'

export const PRIMARY_SWATCHES = [
  '#abff4f', // lime
  '#ff4fd8', // magenta
  '#00e5ff', // cyan
  '#ff6b2b', // orange
  '#ff2d6a', // hot pink
  '#ffe600', // electric yellow
  '#ff5c5c', // coral
] as const

export const SECONDARY_SWATCHES = [
  '#8b5cf6', // purple
  '#ff4fd8', // magenta
  '#00e5ff', // cyan
  '#ff6b2b', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f43f5e', // rose
] as const

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  if (!HEX_PATTERN.test(withHash)) return null
  return withHash.toLowerCase()
}

export function getSetColors(set: {
  primaryColor?: string
  secondaryColor?: string
}) {
  return {
    primaryColor: set.primaryColor ?? DEFAULT_PRIMARY_COLOR,
    secondaryColor: set.secondaryColor ?? DEFAULT_SECONDARY_COLOR,
  }
}

function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex)
  if (!normalized) return { r: 171, g: 255, b: 79 }
  const value = normalized.slice(1)
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  }
}

export function getRelativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const toLinear = (channel: number) => {
    const srgb = channel / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }
  const red = toLinear(r)
  const green = toLinear(g)
  const blue = toLinear(b)
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

export function getAccentForeground(hex: string) {
  return getRelativeLuminance(hex) > 0.55 ? '#050505' : '#ffffff'
}

export function mixHexColors(base: string, mix: string, mixPercent: number) {
  const a = hexToRgb(base)
  const b = hexToRgb(mix)
  const ratio = mixPercent / 100
  const mixChannel = (from: number, to: number) =>
    Math.round(from + (to - from) * ratio)
  const r = mixChannel(a.r, b.r).toString(16).padStart(2, '0')
  const g = mixChannel(a.g, b.g).toString(16).padStart(2, '0')
  const bChannel = mixChannel(a.b, b.b).toString(16).padStart(2, '0')
  return `#${r}${g}${bChannel}`
}

export function getAccentHover(hex: string) {
  return getRelativeLuminance(hex) > 0.55
    ? mixHexColors(hex, '#ffffff', 22)
    : mixHexColors(hex, '#ffffff', 18)
}

export function getSetThemeStyle(colors: {
  primaryColor: string
  secondaryColor: string
}): CSSProperties {
  return {
    '--accent': colors.primaryColor,
    '--accent-hover': getAccentHover(colors.primaryColor),
    '--accent-foreground': getAccentForeground(colors.primaryColor),
    '--secondary': colors.secondaryColor,
  } as CSSProperties
}
