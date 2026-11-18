import type {
  BusinessDetail,
  BusinessRole,
  BusinessSocialPlatform,
  BusinessUpsertRequest,
  DayOfWeek,
  EnquiryStatus,
  GalleryCategory,
  OfferState,
  PaymentMethod,
  QrResolveResult,
  SectionKey,
  SpecialHour,
  StockStatus,
  WorkingHour,
} from '../types/business'

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

/** Monday-first order used everywhere in the UI. */
export const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Upi', label: 'UPI' },
  { value: 'Card', label: 'Debit / Credit card' },
  { value: 'NetBanking', label: 'Net banking' },
  { value: 'Wallet', label: 'Wallets' },
  { value: 'BankTransfer', label: 'Bank transfer' },
  { value: 'PayLater', label: 'Pay later / EMI' },
]

export const paymentLabel = (m: PaymentMethod) => PAYMENT_METHODS.find((p) => p.value === m)?.label ?? m

export const SOCIAL_PLATFORMS: { value: BusinessSocialPlatform; label: string; placeholder: string }[] = [
  { value: 'Instagram', label: 'Instagram', placeholder: 'instagram.com/yourshop' },
  { value: 'Facebook', label: 'Facebook', placeholder: 'facebook.com/yourshop' },
  { value: 'YouTube', label: 'YouTube', placeholder: 'youtube.com/@yourshop' },
  { value: 'LinkedIn', label: 'LinkedIn', placeholder: 'linkedin.com/company/yourshop' },
  { value: 'Twitter', label: 'X (Twitter)', placeholder: 'x.com/yourshop' },
  { value: 'WhatsApp', label: 'WhatsApp channel', placeholder: 'whatsapp.com/channel/…' },
  { value: 'Other', label: 'Other link', placeholder: 'https://…' },
]

export const STOCK_LABELS: Record<StockStatus, string> = {
  InStock: 'In stock',
  LowStock: 'Low stock',
  OutOfStock: 'Out of stock',
  MadeToOrder: 'Made to order',
}

export const STOCK_TONES: Record<StockStatus, 'green' | 'amber' | 'red' | 'violet'> = {
  InStock: 'green',
  LowStock: 'amber',
  OutOfStock: 'red',
  MadeToOrder: 'violet',
}

export const GALLERY_CATEGORIES: { value: GalleryCategory; label: string }[] = [
  { value: 'Interior', label: 'Shop interior' },
  { value: 'Exterior', label: 'Shop exterior' },
  { value: 'Products', label: 'Products' },
  { value: 'Events', label: 'Events' },
  { value: 'Team', label: 'Team' },
  { value: 'Promotions', label: 'Promotions' },
]

export const galleryLabel = (c: GalleryCategory) => GALLERY_CATEGORIES.find((g) => g.value === c)?.label ?? c

export const ENQUIRY_STATUSES: { value: EnquiryStatus; label: string; tone: 'violet' | 'amber' | 'green' | 'gray' }[] = [
  { value: 'New', label: 'New', tone: 'violet' },
  { value: 'InProgress', label: 'In progress', tone: 'amber' },
  { value: 'Responded', label: 'Responded', tone: 'green' },
  { value: 'Closed', label: 'Closed', tone: 'gray' },
]

export const enquiryStatus = (s: EnquiryStatus) => ENQUIRY_STATUSES.find((e) => e.value === s)!

export const OFFER_STATES: Record<OfferState, { label: string; tone: 'green' | 'violet' | 'gray' | 'amber' }> = {
  Live: { label: 'Live', tone: 'green' },
  Scheduled: { label: 'Scheduled', tone: 'violet' },
  Expired: { label: 'Expired', tone: 'gray' },
  Inactive: { label: 'Inactive', tone: 'amber' },
}

export const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'offers', label: 'Offers & promotions' },
  { key: 'products', label: 'Products' },
  { key: 'services', label: 'Services' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'info', label: 'Business information' },
]

export const THEMES: { value: BusinessUpsertRequest['theme']; label: string; description: string }[] = [
  { value: 'classic', label: 'Classic', description: 'Clean white cards with your brand colour.' },
  { value: 'elegant', label: 'Elegant', description: 'Soft tones, serif headings, airy spacing.' },
  { value: 'bold', label: 'Bold', description: 'Strong brand-coloured header and buttons.' },
  { value: 'minimal', label: 'Minimal', description: 'Pared back, typography first.' },
]

export const ROLE_LABELS: Record<BusinessRole, { label: string; description: string }> = {
  Owner: { label: 'Owner', description: 'Full control, including team and deletion.' },
  Manager: { label: 'Manager', description: 'Edit the profile, publish, QR, enquiries and reviews.' },
  Editor: { label: 'Editor', description: 'Manage products, services, offers and gallery.' },
}

const RANK: Record<BusinessRole, number> = { Owner: 0, Manager: 1, Editor: 2 }

/** True when `role` has at least the permissions of `minimum`. Mirrors the server's checks. */
export const hasRole = (role: BusinessRole, minimum: BusinessRole) => RANK[role] <= RANK[minimum]

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/** "1,299.50" / "1299.5" → 129950 paise. Empty → null. Invalid → NaN. */
export function rupeesToPaise(value: string): number | null {
  const v = value.replace(/[,\s₹]/g, '')
  if (!v) return null
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return Number.NaN
  return Math.round(Number(v) * 100)
}

export const paiseToRupees = (paise: number | null | undefined) =>
  paise == null ? '' : (paise / 100).toFixed(paise % 100 === 0 ? 0 : 2)

export function discountPercent(price: number | null, discount: number | null): number | null {
  if (!price || discount == null || discount >= price) return null
  return Math.round(((price - discount) / price) * 100)
}

export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return `${h} hr ${m} min`
  return h ? `${h} hr` : `${m} min`
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

export const defaultWorkingHours = (): WorkingHour[] =>
  DAYS.map((day) => ({ day, isClosed: day === 'Sunday', opens: day === 'Sunday' ? null : '10:00', closes: day === 'Sunday' ? null : '20:00' }))

export function emptyBusinessForm(): BusinessUpsertRequest {
  return {
    name: '',
    categoryId: 0,
    subcategoryId: null,
    description: null,
    yearEstablished: null,
    email: null,
    phone: null,
    whatsApp: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    state: null,
    country: 'India',
    postalCode: null,
    mapsUrl: null,
    latitude: null,
    longitude: null,
    timeZone: 'Asia/Kolkata',
    workingHours: defaultWorkingHours(),
    specialHours: [],
    deliveryAvailable: false,
    pickupAvailable: true,
    paymentMethods: ['Cash', 'Upi'],
    website: null,
    socialLinks: [],
    theme: 'classic',
    brandColor: '#6B3FA0',
    layout: 'grid',
    featuredSections: SECTIONS.map((s) => s.key),
  }
}

/** Maps a loaded business back into the editable request shape. */
export function toBusinessForm(b: BusinessDetail): BusinessUpsertRequest {
  return {
    name: b.name,
    categoryId: b.categoryId,
    subcategoryId: b.subcategoryId,
    description: b.description,
    yearEstablished: b.yearEstablished,
    email: b.email,
    phone: b.phone,
    whatsApp: b.whatsApp,
    addressLine1: b.addressLine1,
    addressLine2: b.addressLine2,
    city: b.city,
    state: b.state,
    country: b.country,
    postalCode: b.postalCode,
    mapsUrl: b.mapsUrl,
    latitude: b.latitude,
    longitude: b.longitude,
    timeZone: b.timeZone,
    workingHours: b.workingHours.length ? DAYS.map((d) => b.workingHours.find((h) => h.day === d) ?? { day: d, isClosed: true, opens: null, closes: null }) : defaultWorkingHours(),
    specialHours: b.specialHours,
    deliveryAvailable: b.deliveryAvailable,
    pickupAvailable: b.pickupAvailable,
    paymentMethods: b.paymentMethods,
    website: b.website,
    socialLinks: b.socialLinks,
    theme: b.theme,
    brandColor: b.brandColor,
    layout: b.layout,
    featuredSections: b.featuredSections,
  }
}

// ---------------------------------------------------------------------------
// Opening hours
// ---------------------------------------------------------------------------

const JS_DAYS: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Current day, date (yyyy-MM-dd) and HH:mm in the business's time zone. */
export function nowInZone(timeZone: string, now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      weekday: 'long',
    }).formatToParts(now)
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
    return { day: get('weekday') as DayOfWeek, date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` }
  } catch {
    const pad = (n: number) => String(n).padStart(2, '0')
    return {
      day: JS_DAYS[now.getDay()]!,
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    }
  }
}

const inRange = (time: string, opens: string, closes: string) =>
  closes > opens ? time >= opens && time < closes : time >= opens || time < closes // overnight hours

export interface OpenState {
  isOpen: boolean
  /** e.g. "Open · closes 21:00", "Closed today · Diwali", "Closed · opens Mon 10:00" */
  label: string
}

/** Works out whether the business is open right now, honouring special (holiday) dates first. */
export function openState(hours: WorkingHour[], special: SpecialHour[], timeZone: string, now = new Date()): OpenState | null {
  if (!hours.length) return null
  const { day, date, time } = nowInZone(timeZone, now)
  const override = special.find((s) => s.date === date)
  if (override) {
    if (override.isClosed || !override.opens || !override.closes)
      return { isOpen: false, label: `Closed today${override.note ? ` · ${override.note}` : ''}` }
    return inRange(time, override.opens, override.closes)
      ? { isOpen: true, label: `Open · closes ${override.closes}` }
      : { isOpen: false, label: `Closed · special hours ${override.opens}–${override.closes}` }
  }
  const today = hours.find((h) => h.day === day)
  if (today && !today.isClosed && today.opens && today.closes && inRange(time, today.opens, today.closes))
    return { isOpen: true, label: `Open · closes ${today.closes}` }
  if (today && !today.isClosed && today.opens && time < today.opens) return { isOpen: false, label: `Closed · opens ${today.opens}` }

  const start = DAYS.indexOf(day)
  for (let i = 1; i <= 7; i++) {
    const next = hours.find((h) => h.day === DAYS[(start + i) % 7])
    if (next && !next.isClosed && next.opens) return { isOpen: false, label: `Closed · opens ${next.day.slice(0, 3)} ${next.opens}` }
  }
  return { isOpen: false, label: 'Closed' }
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const ACCEPTED_IMAGES = 'image/jpeg,image/png,image/webp'

/**
 * Downscales large photos in the browser before upload (max edge 1600px, JPEG/WEBP ~85%).
 * Phone photos shrink from several MB to a few hundred KB, which keeps uploads fast on mobile data
 * and storefronts quick to load. Small images, PNGs with transparency and anything that fails are sent as-is.
 */
export async function optimizeImage(file: File, maxEdge = 1600, quality = 0.85): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file
  if (file.size < 300 * 1024) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()
    const type = file.type === 'image/png' ? 'image/webp' : file.type
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
    if (!blob || blob.size >= file.size) return file
    const ext = type === 'image/webp' ? 'webp' : 'jpg'
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.' + ext, { type })
  } catch {
    return file
  }
}

/** Client-side check mirroring the server rules, so users get instant feedback. */
export function validateImageFile(file: File): string | null {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return 'Only JPG, PNG or WEBP images are allowed.'
  if (file.size > MAX_UPLOAD_BYTES) return 'Images must be 5 MB or smaller.'
  return null
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

export function directionsUrl(b: { mapsUrl: string | null; latitude: number | null; longitude: number | null; addressLine1: string | null; city: string | null; name?: string }) {
  if (b.mapsUrl) return b.mapsUrl
  if (b.latitude != null && b.longitude != null) return `https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}`
  const q = [b.name, b.addressLine1, b.city].filter(Boolean).join(', ')
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null
}

export const whatsAppUrl = (number: string, text?: string) => {
  const digits = number.replace(/[^\d]/g, '')
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export const fullAddress = (b: { addressLine1: string | null; addressLine2: string | null; city: string | null; state: string | null; postalCode: string | null; country: string | null }) =>
  [b.addressLine1, b.addressLine2, [b.city, b.state].filter(Boolean).join(', '), [b.postalCode, b.country].filter(Boolean).join(' ')]
    .filter((p) => p && p.trim())
    .join(', ')

// ---------------------------------------------------------------------------
// QR
// ---------------------------------------------------------------------------

/** Storefront URL for a resolved code. Campaign destinations become ?open=…&id=… deep links the storefront acts on. */
export function storefrontPath({ slug, destination, targetId }: QrResolveResult): string {
  const base = `/business/${encodeURIComponent(slug)}`
  if (destination === 'Profile') return base
  const params = new URLSearchParams({ open: destination.toLowerCase() })
  if (targetId) params.set('id', targetId)
  return `${base}?${params}`
}
