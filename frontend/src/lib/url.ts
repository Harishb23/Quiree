/** Returns the URL only when it is an absolute http(s) URL, preventing javascript:/data: injection. */
export function safeUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

/** Adds https:// when the user typed a bare domain (e.g. "linkedin.com/in/me"). */
export function normalizeUrlInput(value: string): string {
  const v = value.trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  return `https://${v}`
}

const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i

/**
 * True when a typed link (bare domain allowed) is a real-looking web address: http(s), a proper
 * domain name and no "user@" part — so handles like "my&shop" or emails don't slip through.
 */
export function isValidWebLink(value: string | null | undefined): boolean {
  const normalized = normalizeUrlInput(value ?? '')
  if (!normalized || !safeUrl(normalized)) return false
  const url = new URL(normalized)
  return !url.username && !url.password && (url.hostname === 'localhost' || DOMAIN.test(url.hostname))
}

/** Converts a phone number or wa.me link into a WhatsApp URL. */
export function normalizeWhatsApp(value: string): string {
  const v = value.trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  const digits = v.replace(/[^\d]/g, '')
  return digits ? `https://wa.me/${digits}` : v
}

/** Resolves uploaded asset paths (/uploads/...) and absolute URLs for <img src>. */
export function assetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (path.startsWith('/uploads/')) return path
  return safeUrl(path)
}

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`
export const mailHref = (email: string) => `mailto:${email.trim()}`

/** Strips protocol and trailing slash for display. */
export const displayUrl = (url: string) => url.replace(/^https?:\/\//i, '').replace(/\/$/, '')
