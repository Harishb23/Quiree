import type { QrCampaign, QrCampaignUpsertRequest, QrDestination } from '../../../types/business'

export const DESTINATIONS: { value: QrDestination; label: string; hint: string; needsTarget?: 'product' | 'offer'; bulk?: boolean }[] = [
  { value: 'Profile', label: 'Storefront', hint: 'Opens your full business profile.', bulk: true },
  { value: 'Products', label: 'Product catalogue / menu', hint: 'Opens the full product list — ideal for table QR codes.', bulk: true },
  { value: 'Product', label: 'A specific product', hint: 'Opens one product — great on packaging or displays.', needsTarget: 'product' },
  { value: 'Offer', label: 'A specific offer', hint: 'Opens an offer — for posters and banners. Falls back to your storefront after it ends.', needsTarget: 'offer' },
  { value: 'Services', label: 'Services', hint: 'Jumps to your services.', bulk: true },
  { value: 'Reviews', label: 'Reviews', hint: 'Jumps to reviews — put it near the billing counter.', bulk: true },
  { value: 'Enquiry', label: 'Enquiry form', hint: 'Opens the enquiry form directly.', bulk: true },
  { value: 'Gallery', label: 'Gallery', hint: 'Jumps to your photo gallery.', bulk: true },
]

export const destinationLabel = (d: QrDestination) => DESTINATIONS.find((x) => x.value === d)?.label ?? d

export const COLOR_PRESETS: { fg: string; bg: string; label: string }[] = [
  { fg: '#30243D', bg: '#FFFFFF', label: 'Classic' },
  { fg: '#452269', bg: '#F8F5FF', label: 'Lavender' },
  { fg: '#58308B', bg: '#FFFFFF', label: 'Royal purple' },
  { fg: '#6B4E16', bg: '#FBF5E6', label: 'Gold' },
  { fg: '#000000', bg: '#FFFFFF', label: 'Black' },
]

export function emptyCampaign(): QrCampaignUpsertRequest {
  return {
    name: '',
    destination: 'Profile',
    targetId: null,
    isEnabled: true,
    expiresAt: null,
    foregroundColor: '#30243D',
    backgroundColor: '#FFFFFF',
    showLogo: true,
    frameText: 'Scan me',
  }
}

export function toCampaignForm(c: QrCampaign): QrCampaignUpsertRequest {
  return {
    name: c.name,
    destination: c.destination,
    targetId: c.targetId,
    isEnabled: c.isEnabled,
    expiresAt: c.expiresAt,
    foregroundColor: c.foregroundColor,
    backgroundColor: c.backgroundColor,
    showLogo: c.showLogo,
    frameText: c.frameText,
  }
}

/** Client-side checks mirroring the API (name, target, colours, expiry). */
export function validateCampaign(form: QrCampaignUpsertRequest, now = new Date()): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.name.trim()) errors.name = 'Give this QR a name, e.g. “Table 4” or “Diwali poster”.'
  else if (form.name.trim().length > 80) errors.name = 'Keep the name under 80 characters.'
  const dest = DESTINATIONS.find((d) => d.value === form.destination)
  if (dest?.needsTarget && !form.targetId) errors.targetId = `Choose which ${dest.needsTarget} this QR should open.`
  const colour = qrContrastProblem(form.foregroundColor, form.backgroundColor)
  if (colour) errors.colors = colour
  if (form.frameText && form.frameText.length > 40) errors.frameText = 'Keep the caption under 40 characters.'
  if (form.expiresAt && new Date(form.expiresAt) <= now) errors.expiresAt = 'Choose a time in the future (or clear it for no expiry).'
  return errors
}

/** "2026-11-20T18:00" (local input) ⇄ ISO UTC. */
export const localInputToIso = (value: string) => (value ? new Date(value).toISOString() : null)
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** WCAG contrast ratio; mirrors the server rule (dark code on light background, ratio ≥ 4). */
export function qrContrastProblem(fg: string, bg: string): string | null {
  const lum = (hex: string) => {
    const ch = (i: number) => {
      const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * ch(0) + 0.7152 * ch(1) + 0.0722 * ch(2)
  }
  if (!/^#[0-9a-f]{6}$/i.test(fg) || !/^#[0-9a-f]{6}$/i.test(bg)) return 'Use hex colours like #30243D.'
  const f = lum(fg)
  const b = lum(bg)
  if (f >= b) return 'Use a dark code colour on a light background — many phones can’t read light-on-dark codes.'
  if ((b + 0.05) / (f + 0.05) < 4) return 'These colours are too similar to scan reliably.'
  return null
}
