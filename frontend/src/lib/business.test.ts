import { describe, expect, it } from 'vitest'
import {
  directionsUrl,
  discountPercent,
  emptyBusinessForm,
  formatDuration,
  fullAddress,
  hasRole,
  openState,
  paiseToRupees,
  rupeesToPaise,
  validateImageFile,
  whatsAppUrl,
} from './business'
import type { WorkingHour } from '../types/business'

const hours: WorkingHour[] = [
  { day: 'Monday', isClosed: false, opens: '10:00', closes: '20:00' },
  { day: 'Tuesday', isClosed: false, opens: '10:00', closes: '20:00' },
  { day: 'Sunday', isClosed: true, opens: null, closes: null },
]

// 2026-11-16 is a Monday. Times are given in UTC and evaluated in the UTC zone for determinism.
const at = (iso: string) => new Date(iso)

describe('money helpers', () => {
  it('converts rupee input to paise and back', () => {
    expect(rupeesToPaise('1,299.50')).toBe(129950)
    expect(rupeesToPaise('₹ 499')).toBe(49900)
    expect(rupeesToPaise('')).toBeNull()
    expect(rupeesToPaise('12.345')).toBeNaN()
    expect(rupeesToPaise('abc')).toBeNaN()
    expect(paiseToRupees(129950)).toBe('1299.50')
    expect(paiseToRupees(49900)).toBe('499')
    expect(paiseToRupees(null)).toBe('')
  })

  it('computes discount percentage only for real discounts', () => {
    expect(discountPercent(100000, 80000)).toBe(20)
    expect(discountPercent(100000, 100000)).toBeNull()
    expect(discountPercent(null, 500)).toBeNull()
  })

  it('formats durations', () => {
    expect(formatDuration(90)).toBe('1 hr 30 min')
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(120)).toBe('2 hr')
    expect(formatDuration(null)).toBe('')
  })
})

describe('openState', () => {
  it('is open within today’s hours', () => {
    expect(openState(hours, [], 'UTC', at('2026-11-16T12:00:00Z'))).toEqual({ isOpen: true, label: 'Open · closes 20:00' })
  })

  it('reports the opening time before opening', () => {
    expect(openState(hours, [], 'UTC', at('2026-11-16T08:00:00Z'))?.label).toBe('Closed · opens 10:00')
  })

  it('finds the next opening day after closing', () => {
    expect(openState(hours, [], 'UTC', at('2026-11-16T21:00:00Z'))?.label).toBe('Closed · opens Tue 10:00')
  })

  it('lets a special date override the weekly hours', () => {
    const special = [{ date: '2026-11-16', isClosed: true, opens: null, closes: null, note: 'Diwali' }]
    expect(openState(hours, special, 'UTC', at('2026-11-16T12:00:00Z'))).toEqual({ isOpen: false, label: 'Closed today · Diwali' })
  })

  it('handles overnight hours', () => {
    const late: WorkingHour[] = [{ day: 'Monday', isClosed: false, opens: '18:00', closes: '02:00' }]
    expect(openState(late, [], 'UTC', at('2026-11-16T23:30:00Z'))?.isOpen).toBe(true)
  })

  it('respects the business time zone', () => {
    // 05:00 UTC is 10:30 in India, so the shop is open there.
    expect(openState(hours, [], 'Asia/Kolkata', at('2026-11-16T05:00:00Z'))?.isOpen).toBe(true)
  })

  it('returns null when no hours are set', () => {
    expect(openState([], [], 'UTC')).toBeNull()
  })
})

describe('roles', () => {
  it('orders roles Owner > Manager > Editor', () => {
    expect(hasRole('Owner', 'Manager')).toBe(true)
    expect(hasRole('Manager', 'Manager')).toBe(true)
    expect(hasRole('Editor', 'Manager')).toBe(false)
    expect(hasRole('Manager', 'Owner')).toBe(false)
  })
})

describe('links and addresses', () => {
  const base = { name: 'Bloom', mapsUrl: null, latitude: null, longitude: null, addressLine1: '12 Anna Salai', city: 'Chennai' }

  it('prefers the saved maps link, then coordinates, then a search', () => {
    expect(directionsUrl({ ...base, mapsUrl: 'https://maps.app.goo.gl/x' })).toBe('https://maps.app.goo.gl/x')
    expect(directionsUrl({ ...base, latitude: 13.08, longitude: 80.27 })).toContain('destination=13.08,80.27')
    expect(directionsUrl(base)).toContain(encodeURIComponent('Bloom, 12 Anna Salai, Chennai'))
    expect(directionsUrl({ ...base, name: undefined, addressLine1: null, city: null })).toBeNull()
  })

  it('builds WhatsApp links from formatted numbers', () => {
    expect(whatsAppUrl('+91 98765-43210', 'Hi there')).toBe('https://wa.me/919876543210?text=Hi%20there')
  })

  it('joins only the address parts that exist', () => {
    expect(fullAddress({ addressLine1: '12 Anna Salai', addressLine2: null, city: 'Chennai', state: 'TN', postalCode: '600002', country: 'India' })).toBe(
      '12 Anna Salai, Chennai, TN, 600002 India',
    )
  })
})

describe('forms and files', () => {
  it('starts a new business with sensible defaults', () => {
    const form = emptyBusinessForm()
    expect(form.workingHours).toHaveLength(7)
    expect(form.workingHours.find((h) => h.day === 'Sunday')?.isClosed).toBe(true)
    expect(form.featuredSections).toContain('products')
    expect(form.brandColor).toMatch(/^#[0-9A-F]{6}$/i)
  })

  it('validates image type and size before upload', () => {
    expect(validateImageFile(new File(['x'], 'a.gif', { type: 'image/gif' }))).toMatch(/JPG, PNG or WEBP/)
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    expect(validateImageFile(big)).toMatch(/5 MB/)
    expect(validateImageFile(new File(['x'], 'ok.webp', { type: 'image/webp' }))).toBeNull()
  })
})
