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
