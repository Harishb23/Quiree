import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AxiosError, AxiosHeaders } from 'axios'
import PublicProfilePage from './PublicProfilePage'
import { publicApi } from '../../api/endpoints'
import { viewerPreference } from '../../lib/viewerPreference'
import { makeProfile } from '../../test/fixtures'

vi.mock('../../api/endpoints', () => ({
  publicApi: {
    get: vi.fn(),
    vcardUrl: (slug: string, modeId?: string) => `/api/public/${slug}/vcard${modeId ? `?modeId=${modeId}` : ''}`,
    manifestUrl: (slug: string) => `/api/public/${slug}/manifest.webmanifest`,
    qrUrl: (slug: string) => `/api/public/${slug}/qr.png`,
  },
}))

const getProfile = vi.mocked(publicApi.get)

/** Simulates a viewer scanning the QR code: the permanent URL /p/{slug} is opened. */
function openPermanentUrl(slug = 'harish') {
  return render(
    <MemoryRouter initialEntries={[`/p/${slug}`]}>
      <Routes>
        <Route path="/p/:slug" element={<PublicProfilePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const chooserHeading = () => screen.findByRole('heading', { name: /choose a profile mode/i })
const card = () => screen.findByRole('article')
const saveContact = () => screen.getByRole('link', { name: /save contact/i })
const option = (name: RegExp) => screen.getByRole('checkbox', { name })

describe('Public profile scan flow', () => {
  beforeEach(() => {
    localStorage.clear()
    getProfile.mockReset()
  })

  it('first scan: opens the permanent URL and shows the mode chooser with the default preselected', async () => {
    getProfile.mockResolvedValue(makeProfile({ defaultModeId: 'dev' }))
    openPermanentUrl()

    await chooserHeading()
    expect(getProfile).toHaveBeenCalledWith('harish')
    expect(option(/software developer/i)).toBeChecked()
    expect(option(/hr manager/i)).not.toBeChecked()
    expect(viewerPreference.load('harish')).toBeNull()
  })

  it('choosing a mode shows its card and remembers the choice in this browser', async () => {
    getProfile.mockResolvedValue(makeProfile({ defaultModeId: 'hr' }))
    openPermanentUrl()
    await chooserHeading()

    await userEvent.click(option(/hr manager/i)) // unselect default
    await userEvent.click(option(/entrepreneur/i))
    await userEvent.click(screen.getByRole('button', { name: /view profile/i }))

    expect(within(await card()).getByRole('heading', { level: 1, name: 'Harish Baskar' })).toBeInTheDocument()
    expect(screen.getByText('Entrepreneur Designation')).toBeInTheDocument()
    expect(viewerPreference.load('harish')?.modeIds).toEqual(['ent'])
  })

  it('Day 20: returning viewer goes straight to the HR mode chosen before, even though the default changed', async () => {
    viewerPreference.save('harish', ['hr']) // Day 1 choice in this browser
    getProfile.mockResolvedValue(makeProfile({ defaultModeId: 'ent' })) // Day 20: default is Entrepreneur
    openPermanentUrl()

    await card()
    expect(screen.queryByRole('heading', { name: /choose a profile mode/i })).not.toBeInTheDocument()
    expect(screen.getByText('HR Manager Designation')).toBeInTheDocument()
  })

  it('falls back to the current default when the saved mode is no longer published', async () => {
    viewerPreference.save('harish', ['hr'])
    const profile = makeProfile({ defaultModeId: 'ent' })
    profile.modes = profile.modes.filter((m) => m.id !== 'hr')
    getProfile.mockResolvedValue(profile)
    openPermanentUrl()

    await chooserHeading()
    expect(option(/entrepreneur/i)).toBeChecked()
  })

  it('the mode chip on the card lets the viewer switch modes', async () => {
    viewerPreference.save('harish', ['hr'])
    getProfile.mockResolvedValue(makeProfile())
    openPermanentUrl()
    await card()

    await userEvent.click(screen.getByRole('button', { name: /change profile mode/i }))
    await chooserHeading()
    await userEvent.click(option(/hr manager/i))
    await userEvent.click(option(/software developer/i))
    await userEvent.click(screen.getByRole('button', { name: /view profile/i }))

    expect(await screen.findByText('Software Developer Designation')).toBeInTheDocument()
    expect(viewerPreference.load('harish')?.modeIds).toEqual(['dev'])
  })

  it('Save Contact downloads the vCard of the shown mode and then shows the saved screen', async () => {
    viewerPreference.save('harish', ['dev'])
    getProfile.mockResolvedValue(makeProfile())
    openPermanentUrl()
    await card()

    expect(saveContact()).toHaveAttribute('href', '/api/public/harish/vcard?modeId=dev')
    expect(saveContact()).toHaveAttribute('download')

    await userEvent.click(saveContact())
    expect(await screen.findByRole('heading', { name: /contact ready/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /download again/i })).toHaveAttribute('href', '/api/public/harish/vcard?modeId=dev')

    await userEvent.click(screen.getByRole('button', { name: /back to profile/i }))
    expect(await card()).toBeInTheDocument()
  })

  it('multiple chosen modes are shown as tabs on the card screen', async () => {
    getProfile.mockResolvedValue(makeProfile({ defaultModeId: 'hr' }))
    openPermanentUrl()
    await chooserHeading()

    await userEvent.click(option(/software developer/i))
    await userEvent.click(screen.getByRole('button', { name: /view profile/i }))

    const tabs = await screen.findByRole('tablist')
    expect(within(tabs).getAllByRole('tab').map((t) => t.textContent)).toEqual(['HR Manager', 'Software Developer'])
    await userEvent.click(within(tabs).getByRole('tab', { name: 'Software Developer' }))
    expect(saveContact()).toHaveAttribute('href', '/api/public/harish/vcard?modeId=dev')
  })

  it('opens the full resume from the card and comes back', async () => {
    viewerPreference.save('harish', ['hr'])
    getProfile.mockResolvedValue(makeProfile())
    openPermanentUrl()
    await card()

    await userEvent.click(screen.getByRole('button', { name: /view full resume/i }))
    expect(screen.getByRole('button', { name: /back to card/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /back to card/i }))
    expect(await card()).toBeInTheDocument()
  })

  it('skips the chooser when there is only one published mode', async () => {
    const profile = makeProfile()
    profile.modes = profile.modes.slice(0, 1)
    getProfile.mockResolvedValue(profile)
    openPermanentUrl()

    await card()
    expect(screen.queryByRole('button', { name: /change profile mode/i })).not.toBeInTheDocument()
  })

  it('skips the chooser when the owner disabled viewer mode selection', async () => {
    getProfile.mockResolvedValue(makeProfile({ allowViewerModeSelection: false, defaultModeId: 'ent' }))
    openPermanentUrl()

    await card()
    expect(screen.getByText('Entrepreneur Designation')).toBeInTheDocument()
  })

  it('shows a not-found page for unknown or private profiles', async () => {
    getProfile.mockRejectedValue(
      new AxiosError('Not found', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 404,
        statusText: 'Not Found',
        data: {},
        headers: {},
        config: { headers: new AxiosHeaders() },
      }),
    )
    openPermanentUrl('nobody')
    expect(await screen.findByRole('heading', { name: /profile not found/i })).toBeInTheDocument()
  })

  it('explains when the profile has no published modes yet', async () => {
    getProfile.mockResolvedValue(makeProfile({ modes: [], defaultModeId: null }))
    openPermanentUrl()
    expect(await screen.findByText(/hasn’t been published yet/i)).toBeInTheDocument()
  })
})
