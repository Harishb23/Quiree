import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomeWidgetCard } from './HomeWidgetCard'
import * as native from '../../lib/nativeWidget'

vi.mock('../../lib/nativeWidget', () => ({
  widgetSupported: vi.fn(),
  getWidgetState: vi.fn(),
  showOnWidget: vi.fn(),
}))

const qr = { url: 'https://quiree.runasp.net/bq/QZWAVn5Ehs', title: 'cafe startup', openPath: '/dashboard/business/b1/qr' }

describe('HomeWidgetCard', () => {
  beforeEach(() => {
    vi.mocked(native.widgetSupported).mockReturnValue(true)
    vi.mocked(native.getWidgetState).mockResolvedValue({ url: null, title: null, placedWidgets: 0, pinSupported: true })
    vi.mocked(native.showOnWidget).mockReset()
  })

  it('renders nothing on the website (outside the Quiree app)', () => {
    vi.mocked(native.widgetSupported).mockReturnValue(false)
    const { container } = render(<HomeWidgetCard qr={qr} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('adds the widget with this QR inside the app', async () => {
    vi.mocked(native.showOnWidget).mockResolvedValue('pin-requested')
    render(<HomeWidgetCard qr={qr} />)
    await userEvent.click(await screen.findByRole('button', { name: /add qr widget to home screen/i }))
    expect(native.showOnWidget).toHaveBeenCalledWith(qr)
  })

  it('explains how to add it by hand when the launcher can’t place widgets', async () => {
    vi.mocked(native.showOnWidget).mockResolvedValue('add-manually')
    render(<HomeWidgetCard qr={qr} />)
    await userEvent.click(await screen.findByRole('button', { name: /add qr widget/i }))
    expect(await screen.findByText(/long-press an empty spot/i)).toBeInTheDocument()
  })

  it('shows when the placed widget already displays this QR', async () => {
    vi.mocked(native.getWidgetState).mockResolvedValue({ url: qr.url, title: qr.title, placedWidgets: 1, pinSupported: true })
    render(<HomeWidgetCard qr={qr} />)
    expect(await screen.findByText(/your widget is showing this qr code/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /update widget/i })).toBeInTheDocument()
  })
})
