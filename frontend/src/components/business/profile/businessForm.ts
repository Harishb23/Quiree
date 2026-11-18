import { isValidWebLink, normalizeUrlInput } from '../../../lib/url'
import { SECTIONS } from '../../../lib/business'
import type {
  BusinessCategory,
  DayOfWeek,
  SectionKey,
  WorkingHour,
  BusinessDetail,
  BusinessUpsertRequest,
  PublicBusiness,
} from '../../../types/business'

export type WizardStep = 1 | 2 | 3 | 4 | 5

export const STEPS: { step: WizardStep; title: string; short: string }[] = [
  { step: 1, title: 'Basic information', short: 'Basics' },
  { step: 2, title: 'Business address', short: 'Address' },
  { step: 3, title: 'Business operations', short: 'Operations' },
  { step: 4, title: 'Website & social media', short: 'Online' },
  { step: 5, title: 'Customise your profile', short: 'Customise' },
]

export type FormErrors = Record<string, string>

const PHONE = /^[0-9+()\-\s]{6,30}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const HEX = /^#[0-9A-Fa-f]{6}$/

const blank = (v: string | null | undefined) => !v || !v.trim()

/** True when a typed URL (bare domain allowed) normalises to a safe http(s) URL. */
const validUrl = (v: string | null | undefined) => blank(v) || isValidWebLink(v)

/** Client-side checks for one wizard step. Mirrors the server rules so errors appear before submitting. */
export function validateStep(step: WizardStep, f: BusinessUpsertRequest): FormErrors {
  const e: FormErrors = {}
  if (step === 1) {
    if (blank(f.name)) e.name = 'Enter your business name.'
    else if (f.name.trim().length > 120) e.name = 'Keep the name under 120 characters.'
    if (!f.categoryId) e.categoryId = 'Choose a business category.'
    if (!blank(f.email) && !EMAIL.test(f.email!.trim())) e.email = 'Enter a valid email address.'
    if (!blank(f.phone) && !PHONE.test(f.phone!.trim())) e.phone = 'Enter a valid phone number.'
    if (!blank(f.whatsApp) && !PHONE.test(f.whatsApp!.trim())) e.whatsApp = 'Enter a valid WhatsApp number.'
    if (f.yearEstablished != null && (Number.isNaN(f.yearEstablished) || f.yearEstablished < 1800 || f.yearEstablished > new Date().getFullYear()))
      e.yearEstablished = `Enter a year between 1800 and ${new Date().getFullYear()}.`
    if ((f.description ?? '').length > 3000) e.description = 'Keep the description under 3000 characters.'
  }
  if (step === 2) {
    if (!validUrl(f.mapsUrl)) e.mapsUrl = 'Enter a valid Google Maps link.'
    const hasLat = f.latitude != null
    const hasLng = f.longitude != null
    if (hasLat !== hasLng) e.latitude = 'Provide both latitude and longitude, or neither.'
    if (hasLat && (Number.isNaN(f.latitude) || f.latitude! < -90 || f.latitude! > 90)) e.latitude = 'Latitude must be between -90 and 90.'
    if (hasLng && (Number.isNaN(f.longitude) || f.longitude! < -180 || f.longitude! > 180)) e.longitude = 'Longitude must be between -180 and 180.'
  }
  if (step === 3) {
    for (const h of f.workingHours) {
      if (h.isClosed) continue
      if (!h.opens || !h.closes || !TIME.test(h.opens) || !TIME.test(h.closes)) e[`hours.${h.day}`] = `Set opening and closing times for ${h.day}, or mark it closed.`
      else if (h.opens === h.closes) e[`hours.${h.day}`] = `${h.day}: opening and closing times can’t be the same.`
    }
    const seen = new Set<string>()
    f.specialHours.forEach((s, i) => {
      if (!s.date) e[`special.${i}`] = 'Choose a date.'
      else if (seen.has(s.date)) e[`special.${i}`] = 'This date is already listed.'
      else if (!s.isClosed && (!s.opens || !s.closes || !TIME.test(s.opens) || !TIME.test(s.closes)))
        e[`special.${i}`] = 'Set the special hours, or mark the day closed.'
      seen.add(s.date)
    })
    if (f.specialHours.length > 60) e.specialHours = 'You can add up to 60 special dates.'
  }
  if (step === 4) {
    if (!validUrl(f.website)) e.website = 'Enter a valid website address.'
    f.socialLinks.forEach((l, i) => {
      if (blank(l.url)) e[`social.${i}`] = 'Enter a link or remove this row.'
      else if (!validUrl(l.url)) e[`social.${i}`] = 'Enter a full profile link, e.g. instagram.com/yourshop.'
    })
    if (f.socialLinks.length > 12) e.socialLinks = 'You can add up to 12 social links.'
  }
  if (step === 5) {
    if (!HEX.test(f.brandColor)) e.brandColor = 'Use a hex colour like #6B3FA0.'
    if (f.featuredSections.length === 0) e.featuredSections = 'Show at least one section on your profile.'
  }
  return e
}

/** Validates every step; returns the first step with errors (or null) plus all errors. */
export function validateAll(f: BusinessUpsertRequest): { step: WizardStep | null; errors: FormErrors } {
  for (const { step } of STEPS) {
    const errors = validateStep(step, f)
    if (Object.keys(errors).length) return { step, errors }
  }
  return { step: null, errors: {} }
}

const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null)

/** Trims text, turns blanks into null and bare domains into https URLs — the shape the API expects. */
export function toPayload(f: BusinessUpsertRequest): BusinessUpsertRequest {
  return {
    ...f,
    name: f.name.trim(),
    description: clean(f.description),
    email: clean(f.email),
    phone: clean(f.phone),
    whatsApp: clean(f.whatsApp),
    addressLine1: clean(f.addressLine1),
    addressLine2: clean(f.addressLine2),
    city: clean(f.city),
    state: clean(f.state),
    country: clean(f.country),
    postalCode: clean(f.postalCode),
    mapsUrl: clean(f.mapsUrl) ? normalizeUrlInput(f.mapsUrl!) : null,
    website: clean(f.website) ? normalizeUrlInput(f.website!) : null,
    workingHours: f.workingHours.map((h) => (h.isClosed ? { ...h, opens: null, closes: null } : h)),
    specialHours: f.specialHours.map((s) => ({ ...s, note: clean(s.note), opens: s.isClosed ? null : s.opens, closes: s.isClosed ? null : s.closes })),
    socialLinks: f.socialLinks
      .filter((l) => clean(l.url))
      .map((l) => ({ platform: l.platform, label: l.platform === 'Other' ? clean(l.label) : null, url: normalizeUrlInput(l.url) })),
    brandColor: f.brandColor.toUpperCase(),
  }
}

/**
 * Builds the storefront payload for the live preview: the unsaved form fields layered over the saved
 * storefront (which supplies real products, services, offers, gallery and reviews when they exist).
 */
export function buildPreview(
  form: BusinessUpsertRequest,
  options: { business?: BusinessDetail | null; saved?: PublicBusiness | null; categories?: BusinessCategory[] },
): PublicBusiness {
  const { business, saved, categories = [] } = options
  const category = categories.find((c) => c.id === form.categoryId)
  const sub = category?.subcategories.find((s) => s.id === form.subcategoryId)
  const p = toPayload(form)
  return {
    slug: business?.slug ?? 'your-business',
    publicUrl: business?.publicUrl ?? '',
    productCategories: saved?.productCategories ?? [],
    featuredProducts: saved?.featuredProducts ?? [],
    totalProducts: saved?.totalProducts ?? 0,
    services: saved?.services ?? [],
    offers: saved?.offers ?? [],
    gallery: saved?.gallery ?? [],
    reviews: saved?.reviews ?? [],
    rating: saved?.rating ?? { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] },
    upcomingSpecialHours: p.specialHours,
    isVerified: business?.isVerified ?? false,
    isPreview: true,
    name: p.name || 'Your business name',
    categoryName: category?.name ?? business?.categoryName ?? '',
    categoryIcon: category?.icon ?? business?.categoryIcon ?? 'store',
    subcategoryName: sub?.name ?? null,
    logoUrl: business?.logoUrl ?? null,
    coverUrl: business?.coverUrl ?? null,
    description: p.description,
    yearEstablished: p.yearEstablished,
    email: p.email,
    phone: p.phone,
    whatsApp: p.whatsApp,
    website: p.website,
    addressLine1: p.addressLine1,
    addressLine2: p.addressLine2,
    city: p.city,
    state: p.state,
    country: p.country,
    postalCode: p.postalCode,
    mapsUrl: p.mapsUrl,
    latitude: p.latitude,
    longitude: p.longitude,
    timeZone: p.timeZone ?? business?.timeZone ?? 'Asia/Kolkata',
    workingHours: p.workingHours,
    deliveryAvailable: p.deliveryAvailable,
    pickupAvailable: p.pickupAvailable,
    paymentMethods: p.paymentMethods,
    socialLinks: p.socialLinks,
    theme: p.theme,
    brandColor: p.brandColor,
    layout: p.layout,
    featuredSections: p.featuredSections.length ? p.featuredSections : SECTIONS.map((s) => s.key),
  }
}

const WEEKDAYS: DayOfWeek[] = ['Tuesday', 'Wednesday', 'Thursday', 'Friday']

/** Copies Monday's schedule to Tuesday–Friday. Exported for tests. */
export function applyMondayToWeekdays(hours: WorkingHour[]): WorkingHour[] {
  const monday = hours.find((h) => h.day === 'Monday')
  if (!monday) return hours
  return hours.map((h) => (WEEKDAYS.includes(h.day) ? { ...monday, day: h.day } : h))
}

/** Included sections in their chosen order, followed by the excluded ones. */
export function sectionRows(featured: SectionKey[]) {
  const included = featured.filter((k) => SECTIONS.some((s) => s.key === k))
  const excluded = SECTIONS.map((s) => s.key).filter((k) => !included.includes(k))
  return [...included.map((key) => ({ key, on: true })), ...excluded.map((key) => ({ key, on: false }))]
}

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

/** Client mirror of the server's slug rules. Exported for tests. */
export function validateSlug(slug: string): string | null {
  if (slug.length < 3 || slug.length > 60) return 'Use 3–60 characters.'
  if (!SLUG_PATTERN.test(slug) || slug.includes('--')) return 'Use lowercase letters, numbers and single hyphens (not at the start or end).'
  return null
}
