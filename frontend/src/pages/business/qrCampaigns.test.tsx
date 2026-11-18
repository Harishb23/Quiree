import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import QrCampaignsPage from './QrCampaignsPage'
import { BusinessProvider } from './BusinessShell'
import { qrCampaignsApi } from '../../api/businessApi'
import { emptyCampaign, qrContrastProblem, validateCampaign } from '../../components/business/qr/campaignForm'
import { storefrontPath } from '../../lib/business'
import type { BusinessDetail, QrCampaign } from '../../types/business'

vi.mock('../../api/businessApi', () => ({
  qrCampaignsApi: { list: vi.fn(), stats: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), createBulk: vi.fn(), downloadZip: vi.fn() },
  businessCatalogApi: { products: vi.fn(), offers: vi.fn() },
  publicBusinessApi: { resolveQr: vi.fn() },
}))

const business = {
  id: 'b1',
  name: 'Spice Route',
  slug: 'spice-route',
  logoUrl: null,
  status: 'Published',
  myRole: 'Owner',
} as unknown as BusinessDetail

const campaign = (overrides: Partial<QrCampaign> = {}): QrCampaign => ({
  ...emptyCampaign(),
  id: 'c1',
  name: 'Table 1',
  code: 'AbCdEf2345',
  qrUrl: 'https://quiree.test/bq/AbCdEf2345',
  destination: 'Products',
  targetName: null,
  isExpired: false,
  totalScans: 12,
  scansLast30Days: 5,
  createdAt: '2026-11-18T10:00:00Z',
  ...overrides,
})

function renderPage(role: 'Owner' | 'Editor' = 'Owner') {
  return render(
    <MemoryRouter>
      <BusinessProvider business={{ ...business, myRole: role }}>
        <QrCampaignsPage />
      </BusinessProvider>
    </MemoryRouter>,
  )
}

describe('campaign form rules', () => {
  it('requires a name and a target for product / offer destinations', () => {
    expect(validateCampaign({ ...emptyCampaign(), name: '' }).name).toBeTruthy()
    expect(validateCampaign({ ...emptyCampaign(), name: 'Box', destination: 'Product' }).targetId).toMatch(/product/)
    expect(validateCampaign({ ...emptyCampaign(), name: 'Box', destination: 'Product', targetId: 'p1' })).toEqual({})
  })

  it('rejects light-on-dark and low-contrast colours, like the server', () => {
    expect(qrContrastProblem('#FFFFFF', '#000000')).toMatch(/dark code colour/)
    expect(qrContrastProblem('#BBBBBB', '#FFFFFF')).toMatch(/too similar/)
    expect(qrContrastProblem('#30243D', '#FFFFFF')).toBeNull()
  })

  it('rejects an expiry in the past', () => {
    const now = new Date('2026-11-18T12:00:00Z')
    expect(validateCampaign({ ...emptyCampaign(), name: 'x', expiresAt: '2026-11-18T11:00:00Z' }, now).expiresAt).toBeTruthy()
    expect(validateCampaign({ ...emptyCampaign(), name: 'x', expiresAt: '2026-11-19T11:00:00Z' }, now).expiresAt).toBeUndefined()
  })
})

describe('QR deep links', () => {
  it('builds storefront URLs for each destination', () => {
    expect(storefrontPath({ slug: 'spice-route', destination: 'Profile', targetId: null })).toBe('/business/spice-route')
    expect(storefrontPath({ slug: 'spice-route', destination: 'Product', targetId: 'p1' })).toBe('/business/spice-route?open=product&id=p1')
    expect(storefrontPath({ slug: 'spice-route', destination: 'Reviews', targetId: null })).toBe('/business/spice-route?open=reviews')
  })
})

describe('QR campaigns page', () => {
  beforeEach(() => {
    vi.mocked(qrCampaignsApi.list).mockResolvedValue([campaign(), campaign({ id: 'c2', name: 'Poster', isEnabled: false, destination: 'Profile' })])
    vi.mocked(qrCampaignsApi.stats).mockResolvedValue({
      from: '2026-10-20',
      to: '2026-11-18',
      days: 30,
      items: [
        { campaignId: 'c1', name: 'Table 1', scans: 5, uniqueVisitors: 4, daily: [] },
        { campaignId: null, name: 'Main storefront QR', scans: 2, uniqueVisitors: 2, daily: [] },
      ],
    })
  })

  it('lists campaigns with their status and compares scans', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Table 1' })).toBeInTheDocument()
    expect(screen.getByText('Off')).toBeInTheDocument()
    const bars = await screen.findByRole('list', { name: /scans per qr code/i })
    expect(within(bars).getByText('Main storefront QR')).toBeInTheDocument()
    expect(within(bars).getAllByText(/scans/)[0]).toHaveTextContent('5 scans')
  })

  it('creates a campaign from the editor and shows it in the list', async () => {
    vi.mocked(qrCampaignsApi.create).mockResolvedValue(campaign({ id: 'c3', name: 'Billing counter', destination: 'Reviews' }))
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /new campaign/i }))
    await userEvent.type(screen.getByLabelText(/^name/i), 'Billing counter')
    await userEvent.selectOptions(screen.getByLabelText(/when scanned, open/i), 'Reviews')
    await userEvent.click(screen.getByRole('button', { name: 'Black' }))
    await userEvent.click(screen.getByRole('button', { name: /create qr code/i }))
    expect(qrCampaignsApi.create).toHaveBeenCalledWith('b1', expect.objectContaining({ name: 'Billing counter', destination: 'Reviews', targetId: null }))
    expect(await screen.findByRole('heading', { name: 'Billing counter' })).toBeInTheDocument()
  })

  it('hides management actions from editors', async () => {
    renderPage('Editor')
    await screen.findByRole('heading', { name: 'Table 1' })
    expect(screen.queryByRole('button', { name: /new campaign/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit table 1/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download all/i })).toBeInTheDocument()
  })
})
