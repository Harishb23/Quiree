import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { businessApi, businessEngagementApi } from '../../api/businessApi'
import { BusinessProvider } from './BusinessShell'
import BusinessDashboardPage from './BusinessDashboardPage'
import EnquiriesPage from './EnquiriesPage'
import ReviewsPage from './ReviewsPage'
import { delta, summarize } from '../../components/business/insights/insightsUtils'
import type {
  AnalyticsTotals,
  BusinessDashboard,
  BusinessDetail,
  BusinessRole,
  EnquiryDetail,
  Review,
} from '../../types/business'

vi.mock('../../api/businessApi', () => ({
  businessApi: { dashboard: vi.fn(), analytics: vi.fn() },
  businessEngagementApi: {
    enquiries: vi.fn(),
    enquiry: vi.fn(),
    setEnquiryStatus: vi.fn(),
    respond: vi.fn(),
    reviews: vi.fn(),
    updateReview: vi.fn(),
    deleteReview: vi.fn(),
  },
}))

function makeBusiness(role: BusinessRole = 'Owner'): BusinessDetail {
  return {
    id: 'b1',
    slug: 'sole-street',
    name: 'Sole Street',
    categoryId: 1,
    categoryName: 'Footwear and Shoe Shops',
    categoryIcon: 'footprints',
    subcategoryId: null,
    subcategoryName: null,
    logoUrl: null,
    coverUrl: null,
    description: null,
    yearEstablished: null,
    email: null,
    phone: '+91 98765 43210',
    whatsApp: null,
    addressLine1: null,
    addressLine2: null,
    city: 'Chennai',
    state: null,
    country: 'India',
    postalCode: null,
    mapsUrl: null,
    latitude: null,
    longitude: null,
    timeZone: 'Asia/Kolkata',
    workingHours: [],
    specialHours: [],
    deliveryAvailable: false,
    pickupAvailable: true,
    paymentMethods: [],
    website: null,
    socialLinks: [],
    theme: 'classic',
    brandColor: '#6B3FA0',
    layout: 'grid',
    featuredSections: [],
    status: 'Published',
    isVerified: false,
    publishedAt: null,
    publicUrl: 'https://x.test/business/sole-street',
    myRole: role,
    completion: { percent: 50, missing: [] },
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
  }
}

const zero: AnalyticsTotals = {
  qrScans: 0,
  uniqueVisitors: 0,
  profileViews: 0,
  productViews: 0,
  whatsAppClicks: 0,
  callClicks: 0,
  websiteClicks: 0,
  directionsClicks: 0,
  shareClicks: 0,
  enquiries: 0,
}

function makeDashboard(): BusinessDashboard {
  return {
    business: {
      id: 'b1',
      name: 'Sole Street',
      slug: 'sole-street',
      categoryName: 'Footwear and Shoe Shops',
      categoryIcon: 'footprints',
      logoUrl: null,
      city: 'Chennai',
      status: 'Published',
      myRole: 'Owner',
      publicUrl: 'https://x.test/business/sole-street',
      updatedAt: '2026-11-01T00:00:00Z',
    },
    completion: { percent: 70, missing: ['Gallery photos'] },
    qrEnabled: true,
    analytics: {
      from: '2026-11-12',
      to: '2026-11-18',
      days: 7,
      totals: { ...zero, qrScans: 1234, profileViews: 87, whatsAppClicks: 5 },
      previousTotals: { ...zero, qrScans: 1000, profileViews: 0 },
      daily: [
        { date: '2026-11-17', views: 40, scans: 600, clicks: 2, visitors: 30 },
        { date: '2026-11-18', views: 47, scans: 634, clicks: 3, visitors: 35 },
      ],
      topProducts: [{ productId: 'p1', name: 'Air Runner', imageUrl: null, views: 12 }],
    },
    productCount: 3,
    serviceCount: 1,
    galleryCount: 0,
    newEnquiries: 1,
    pendingReviews: 0,
    activeOffers: [],
    recentEnquiries: [
      {
        id: 'e1',
        customerName: 'Asha Rao',
        phone: null,
        email: 'asha@example.com',
        subject: 'Size 8?',
        messagePreview: 'Do you have size 8?',
        relatedItemName: null,
        status: 'New',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    recentActivity: [{ kind: 'scan', title: 'QR code scanned', detail: null, occurredAt: new Date().toISOString() }],
  }
}

function renderWith(ui: React.ReactNode, role: BusinessRole = 'Owner', path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BusinessProvider business={makeBusiness(role)}>{ui}</BusinessProvider>
    </MemoryRouter>,
  )
}

describe('insight helpers', () => {
  it('computes change versus the previous period', () => {
    expect(delta(120, 100)).toMatchObject({ kind: 'up', percent: 20 })
    expect(delta(50, 100)).toMatchObject({ kind: 'down', percent: 50 })
    expect(delta(100, 100)).toMatchObject({ kind: 'flat', percent: 0 })
    expect(delta(5, 0)).toMatchObject({ kind: 'new', percent: null })
    expect(delta(0, 0)).toMatchObject({ kind: 'none' })
  })

  it('summarises only approved reviews', () => {
    const r = (rating: number, status: Review['status']): Review => ({
      id: `${rating}${status}`,
      customerName: 'X',
      rating,
      comment: null,
      status,
      ownerReply: null,
      createdAt: '2026-11-01T00:00:00Z',
    })
    expect(summarize([r(5, 'Approved'), r(4, 'Approved'), r(1, 'Pending')])).toEqual({ average: 4.5, count: 2, distribution: [0, 0, 0, 1, 1] })
  })
})

describe('Business dashboard', () => {
  beforeEach(() => vi.mocked(businessApi.dashboard).mockResolvedValue(makeDashboard()))

  it('renders KPI values from the API with deltas and recent enquiries', async () => {
    renderWith(<BusinessDashboardPage />)
    expect(await screen.findByText('1,234')).toBeInTheDocument()
    expect(screen.getAllByText('QR scans').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByLabelText('Up 23% vs previous period')).toBeInTheDocument()
    expect(screen.getAllByLabelText('New this period')).toHaveLength(2) // profile views and WhatsApp went from 0
    expect(screen.getByText('Asha Rao')).toBeInTheDocument()
    expect(screen.getByText('Air Runner')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+ Gallery photos' })).toHaveAttribute('href', '/dashboard/business/b1/gallery')
  })

  it('hides enquiry details from editors', async () => {
    renderWith(<BusinessDashboardPage />, 'Editor')
    await screen.findByText('1,234')
    expect(screen.queryByText('Asha Rao')).not.toBeInTheDocument()
    expect(screen.getByText(/visible to the owner and managers/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /edit profile/i })).not.toBeInTheDocument()
  })
})

describe('Enquiries', () => {
  const detail: EnquiryDetail = {
    id: 'e1',
    customerName: 'Asha Rao',
    phone: '9876543210',
    email: 'asha@example.com',
    subject: 'Size 8?',
    message: 'Do you have size 8?',
    productId: null,
    serviceId: null,
    relatedItemName: 'Air Runner',
    status: 'New',
    createdAt: '2026-11-18T10:00:00Z',
    activities: [{ id: 'a1', type: 'Created', status: 'New', message: null, byName: 'Asha Rao', createdAt: '2026-11-18T10:00:00Z' }],
  }

  beforeEach(() => {
    vi.mocked(businessEngagementApi.enquiries).mockResolvedValue({ items: makeDashboard().recentEnquiries, total: 1, page: 1, pageSize: 20 })
    vi.mocked(businessEngagementApi.enquiry).mockResolvedValue(detail)
  })

  it('is blocked for editors', () => {
    renderWith(<EnquiriesPage />, 'Editor')
    expect(screen.getByText(/don’t have access/i)).toBeInTheDocument()
    expect(businessEngagementApi.enquiries).not.toHaveBeenCalled()
  })

  it('updates status and sends a reply, refreshing the history', async () => {
    vi.mocked(businessEngagementApi.setEnquiryStatus).mockResolvedValue({
      ...detail,
      status: 'InProgress',
      activities: [...detail.activities, { id: 'a2', type: 'StatusChanged', status: 'InProgress', message: 'Checking', byName: 'Owner', createdAt: '2026-11-18T11:00:00Z' }],
    })
    vi.mocked(businessEngagementApi.respond).mockImplementation(async (_b, _e, message) => ({
      ...detail,
      status: 'Responded',
      activities: [...detail.activities, { id: 'a3', type: 'Response', status: 'Responded', message, byName: 'Owner', createdAt: '2026-11-18T12:00:00Z' }],
    }))

    renderWith(<EnquiriesPage />, 'Manager', '/?open=e1')
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('Do you have size 8?')).toBeInTheDocument()

    await userEvent.selectOptions(within(dialog).getByLabelText('Status'), 'InProgress')
    await userEvent.type(within(dialog).getByLabelText('Internal note (optional)'), 'Checking')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Update' }))
    expect(businessEngagementApi.setEnquiryStatus).toHaveBeenCalledWith('b1', 'e1', 'InProgress', 'Checking')
    expect(await within(dialog).findByText(/Marked in progress by Owner/)).toBeInTheDocument()

    await userEvent.type(within(dialog).getByLabelText('Reply message'), 'Yes, in stock!')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send reply' }))
    expect(businessEngagementApi.respond).toHaveBeenCalledWith('b1', 'e1', 'Yes, in stock!', true)
    expect(await within(dialog).findByText('Reply sent by Owner')).toBeInTheDocument()
    expect(within(dialog).getByText('Yes, in stock!')).toBeInTheDocument()
  })
})

describe('Reviews', () => {
  const pending: Review = {
    id: 'r1',
    customerName: 'Ravi',
    rating: 4,
    comment: 'Great fit',
    status: 'Pending',
    ownerReply: null,
    createdAt: '2026-11-18T10:00:00Z',
  }

  beforeEach(() => vi.mocked(businessEngagementApi.reviews).mockResolvedValue([pending]))

  it('lets managers approve a pending review', async () => {
    vi.mocked(businessEngagementApi.updateReview).mockResolvedValue({ ...pending, status: 'Approved' })
    renderWith(<ReviewsPage />, 'Manager')
    expect(await screen.findByText('Great fit')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(businessEngagementApi.updateReview).toHaveBeenCalledWith('b1', 'r1', 'Approved', null)
    // Moves out of the Pending tab; the summary now counts it.
    expect(await screen.findByText('1 approved review')).toBeInTheDocument()
    expect(screen.getByText('4.0')).toBeInTheDocument()
  })

  it('is read-only for editors', async () => {
    renderWith(<ReviewsPage />, 'Editor')
    expect(await screen.findByText('Great fit')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
  })
})
