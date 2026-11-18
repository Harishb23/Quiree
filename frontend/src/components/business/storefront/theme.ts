import type { CSSProperties } from 'react'

/** Parses "#RRGGBB"; falls back to the platform purple for anything unexpected. */
function parseHex(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  const v = m ? m[1]! : '6B3FA0'
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]
}

/** WCAG relative luminance (0 = black, 1 = white). */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

/** White text only when it reaches 4.5:1 on the brand colour; otherwise the dark primary text. */
export function onBrandText(hex: string): string {
  return contrast(luminance(hex), 1) >= 4.5 ? '#FFFFFF' : '#30243D'
}

function mix(hex: string, withHex: string, amount: number): string {
  const a = parseHex(hex)
  const b = parseHex(withHex)
  const c = a.map((v, i) => Math.round(v * (1 - amount) + b[i]! * amount))
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/**
 * CSS custom properties for the business's brand colour.
 * `--brand-ink` is a darkened variant used for text on white, so links stay readable even for pale brand colours.
 */
export function brandVars(brandColor: string): CSSProperties {
  const brand = /^#[0-9a-f]{6}$/i.test(brandColor) ? brandColor : '#6B3FA0'
  const lum = luminance(brand)
  // Darken pale colours until they read on white (≥4.5:1).
  let ink = brand
  for (let i = 1; i <= 10 && contrast(luminance(ink), 1) < 4.5; i++) ink = mix(brand, '#1a1024', i * 0.1)
  return {
    '--brand': brand,
    '--brand-ink': ink,
    '--brand-on': onBrandText(brand),
    '--brand-soft': mix(brand, '#ffffff', lum > 0.6 ? 0.55 : 0.88),
    '--brand-softer': mix(brand, '#ffffff', 0.95),
  } as CSSProperties
}
