import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import QrHomeScreenPage from './QrHomeScreenPage'
import { BrandedQr, BrandedQrTile } from '../../components/qr/BrandedQr'
import { publicApi } from '../../api/endpoints'
import { makeProfile } from '../../test/fixtures'

vi.mock('../../api/endpoints', () => ({
  publicApi: {
    get: vi.fn(),
    qrManifestUrl: (slug: string) => `/api/public/${slug}/qr-manifest.webmanifest`,
  },
}))

const getProfile = vi.mocked(publicApi.get)

function openMyQr(slug = 'harish') {
  return render(
    <MemoryRouter initialEntries={[`/q/${slug}`]}>
      <Routes>
        <Route path="/q/:slug" element={<QrHomeScreenPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('My QR home-screen page', () => {
  beforeEach(() => getProfile.mockReset())

  it('shows the branded QR full screen and links the QR install manifest', async () => {
    getProfile.mockResolvedValue(makeProfile({ defaultModeId: 'dev' }))
    openMyQr()

    expect(await screen.findByRole('img', { name: /scan to open/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Harish Baskar' })).toBeInTheDocument()
    expect(screen.getByText('Software Developer Designation')).toBeInTheDocument()
    await waitFor(() =>
      expect(document.head.querySelector('link[rel="manifest"]')).toHaveAttribute('href', '/api/public/harish/qr-manifest.webmanifest'),
    )
    expect(screen.getByRole('button', { name: /add qr to home screen/i })).toBeInTheDocument()
  })
})

describe('BrandedQr', () => {
  it('draws three finder eyes, the brand and the call to action', () => {
    const { container } = render(<BrandedQr url="https://quiree.runasp.net/p/harish" brand="Quiree" />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAccessibleName('QR code: scan to open Quiree')
    expect(svg.querySelectorAll('rect[stroke]')).toHaveLength(3)
    expect(svg.textContent).toContain('Scan to Open')
    expect(svg.textContent).toContain('Quiree')
  })
})

describe('BrandedQrTile', () => {
  it('is a compact widget tile with the scan prompt', () => {
    const { container } = render(<BrandedQrTile url="https://quiree.runasp.net/p/harish" brand="Quiree" />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAccessibleName('QR widget: scan to open Quiree')
    expect(svg.querySelectorAll('rect[stroke]')).toHaveLength(3)
    expect(svg.textContent).toBe('Scan to open Quiree')
  })
})
