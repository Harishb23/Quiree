import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { BusinessStorefront } from '../../components/business/storefront/BusinessStorefront'
import { validateEnquiry } from '../../components/business/storefront/StorefrontForms'
import { luminance, onBrandText } from '../../components/business/storefront/theme'
import BusinessQrResolvePage from './BusinessQrResolvePage'
import { publicBusinessApi } from '../../api/businessApi'
import type { PublicBusiness } from '../../types/business'

vi.mock('../../api/businessApi', () => ({
  publicBusinessApi: {
    get: vi.fn(),
    products: vi.fn(),
    enquire: vi.fn(),
    review: vi.fn(),
    track: vi.fn(),
    resolveQr: vi.fn(),
  },
}))

function makeBusiness(overrides: Partial<PublicBusiness> = {}): PublicBusiness {
  return {
    slug: 'sole-street',
    name: 'Sole Street',
    categoryName: 'Footwear and Shoe Shops',
    categoryIcon: 'footprints',
    subcategoryName: 'Sports Shoes',
    logoUrl: null,
    coverUrl: null,
    description: 'Sneakers for every step.',
    yearEstablished: 2015,
    isVerified: false,
    email: null,
    phone: '+91 98765 43210',
    whatsApp: null,
    website: null,
    addressLine1: null,
    addressLine2: null,
    city: 'Chennai',
    state: null,
    country: null,
    postalCode: null,
    mapsUrl: null,
    latitude: null,
    longitude: null,
    timeZone: 'Asia/Kolkata',
    workingHours: [],
    upcomingSpecialHours: [],
    deliveryAvailable: false,
    pickupAvailable: true,
    paymentMethods: ['Cash'],
    socialLinks: [],
    theme: 'classic',
    brandColor: '#6B3FA0',
    layout: 'grid',
    featuredSections: ['info', 'offers', 'products', 'services'],
    productCategories: [],
    featuredProducts: [],
    totalProducts: 0,
    services: [],
    offers: [
      { id: 'o1', title: 'Diwali Sale', description: null, discountPercent: 20, discountAmountInPaise: null, bannerUrl: null, endDate: '2030-01-10', isFeatured: true },
    ],
    gallery: [],
    reviews: [],
    rating: { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] },
    publicUrl: 'https://quiree.test/business/sole-street',
    isPreview: false,
    ...overrides,
  }
}

const renderStorefront = (b: PublicBusiness, preview = false) =>
  render(
    <MemoryRouter>
      <BusinessStorefront business={b} preview={preview} />
    </MemoryRouter>,
  )

describe('Business storefront', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders sections in the owner’s order and hides empty ones', () => {
    renderStorefront(makeBusiness())
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['Business information', 'Offers & promotions', 'Send an enquiry'])
    expect(screen.queryByText('Products')).not.toBeInTheDocument()
    expect(screen.queryByText('Services')).not.toBeInTheDocument()
    expect(screen.getByText('20% OFF')).toBeInTheDocument()
  })

  it('shows quick actions only for the contact details the business has', () => {
    const { unmount } = renderStorefront(makeBusiness())
    let bar = within(screen.getByRole('navigation', { name: 'Quick actions' }))
    expect(bar.getByRole('link', { name: /call/i })).toHaveAttribute('href', 'tel:+919876543210')
    expect(bar.queryByRole('link', { name: /whatsapp/i })).not.toBeInTheDocument()
    expect(bar.queryByRole('link', { name: /website/i })).not.toBeInTheDocument()
    expect(bar.queryByRole('link', { name: /directions/i })).not.toBeInTheDocument()
    expect(bar.getByRole('button', { name: /share/i })).toBeInTheDocument()
    unmount()

    renderStorefront(makeBusiness({ whatsApp: '98765 43210', website: 'https://solestreet.test', addressLine1: '12 Anna Salai' }))
    bar = within(screen.getByRole('navigation', { name: 'Quick actions' }))
    expect(bar.getByRole('link', { name: /whatsapp/i }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/9876543210/)
    expect(bar.getByRole('link', { name: /website/i })).toBeInTheDocument()
    expect(bar.getByRole('link', { name: /directions/i })).toBeInTheDocument()
  })

  it('records clicks on public pages but never in preview', async () => {
    const { unmount } = renderStorefront(makeBusiness())
    await userEvent.click(screen.getAllByRole('link', { name: /call/i })[0]!)
    expect(publicBusinessApi.track).toHaveBeenCalledWith('sole-street', 'CallClick', undefined)
    unmount()
    vi.mocked(publicBusinessApi.track).mockClear()

    renderStorefront(makeBusiness(), true)
    await userEvent.click(screen.getAllByRole('link', { name: /call/i })[0]!)
    expect(publicBusinessApi.track).not.toHaveBeenCalled()
  })

  it('preview mode shows the ribbon and disables the enquiry form', () => {
    renderStorefront(makeBusiness(), true)
    expect(screen.getByText(/preview — not visible to customers/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/your name/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /send enquiry/i })).toBeDisabled()
  })

  it('enquiries need a phone number or an email before submitting', async () => {
    renderStorefront(makeBusiness())
    const form = within(screen.getByRole('form', { name: 'Send an enquiry' }))
    await userEvent.type(form.getByLabelText(/your name/i), 'Asha')
    await userEvent.type(form.getByLabelText(/subject/i), 'Size 8?')
    await userEvent.type(form.getByLabelText(/message/i), 'Do you have size 8?')
    await userEvent.click(form.getByRole('button', { name: /send enquiry/i }))
    expect(await form.findByText(/phone number or email/i)).toBeInTheDocument()
    expect(publicBusinessApi.enquire).not.toHaveBeenCalled()

    vi.mocked(publicBusinessApi.enquire).mockResolvedValue({ id: 'e1', message: 'Thanks! The business will get back to you soon.' })
    await userEvent.type(form.getByLabelText(/email/i), 'asha@example.com')
    await userEvent.click(form.getByRole('button', { name: /send enquiry/i }))
    expect(publicBusinessApi.enquire).toHaveBeenCalledWith('sole-street', expect.objectContaining({ email: 'asha@example.com', phone: null }))
    expect(await screen.findByText(/enquiry sent to sole street/i)).toBeInTheDocument()
  })

  it('validates enquiry fields like the server does', () => {
    const base = { customerName: 'A', phone: '', email: '', subject: 'S', message: 'Hello there', related: '' }
    expect(validateEnquiry(base)).toHaveProperty('phone')
    expect(validateEnquiry({ ...base, phone: '98765 43210' })).toEqual({})
    expect(validateEnquiry({ ...base, email: 'not-an-email' })).toHaveProperty('email')
  })

  it('picks readable text on the brand colour', () => {
    expect(onBrandText('#452269')).toBe('#FFFFFF')
    expect(onBrandText('#F8EFD8')).toBe('#30243D')
    expect(luminance('#FFFFFF')).toBeCloseTo(1)
  })
})

describe('Business QR resolve page', () => {
  beforeEach(() => vi.clearAllMocks())

  const renderResolve = () =>
    render(
      <MemoryRouter initialEntries={['/bq/AbCdEf2345']}>
        <Routes>
          <Route path="bq/:code" element={<BusinessQrResolvePage />} />
          <Route path="business/:slug" element={<p>Storefront opened</p>} />
        </Routes>
      </MemoryRouter>,
    )

  it('redirects to the business storefront', async () => {
    vi.mocked(publicBusinessApi.resolveQr).mockResolvedValue({ slug: 'sole-street', destination: 'Profile', targetId: null })
    renderResolve()
    expect(await screen.findByText('Storefront opened')).toBeInTheDocument()
    expect(publicBusinessApi.resolveQr).toHaveBeenCalledWith('AbCdEf2345')
  })

  it('explains when the business turned the QR code off', async () => {
    vi.mocked(publicBusinessApi.resolveQr).mockRejectedValue({ isAxiosError: true, response: { status: 410, data: {} } })
    renderResolve()
    expect(await screen.findByText(/turned off by the business/i)).toBeInTheDocument()
    expect(screen.queryByText('Storefront opened')).not.toBeInTheDocument()
  })

  it('explains when the code is not recognised', async () => {
    vi.mocked(publicBusinessApi.resolveQr).mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: { detail: 'This QR code isn’t recognised.' } },
    })
    renderResolve()
    expect(await screen.findByText(/qr not recognised/i)).toBeInTheDocument()
  })
})
