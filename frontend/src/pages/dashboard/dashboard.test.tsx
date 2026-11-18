import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import MyProfilePage, { validateProfile } from './MyProfilePage'
import QrCodePage from './QrCodePage'
import { profileApi, qrApi } from '../../api/endpoints'
import { emptyModeForm, toPayload, validateMode } from './modeEditor/modeForm'
import type { Profile } from '../../types/api'

vi.mock('../../api/endpoints', () => ({
  profileApi: { get: vi.fn(), update: vi.fn(), uploadPhoto: vi.fn(), removePhoto: vi.fn() },
  qrApi: { info: vi.fn(), png: vi.fn(), svg: vi.fn() },
  authApi: { me: vi.fn(), logout: vi.fn() },
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ updateUser: vi.fn(), user: null }),
}))

const profile: Profile = {
  fullName: 'Harish Baskar',
  photoUrl: null,
  email: 'harish@example.com',
  mobile: '+91 98765 43210',
  location: 'Pondicherry, India',
  website: null,
  summary: 'Full stack developer',
  socialLinks: [],
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('Profile form', () => {
  beforeEach(() => {
    vi.mocked(profileApi.get).mockResolvedValue(profile)
    vi.mocked(profileApi.update).mockReset()
  })

  it('validates name, email, phone and website', () => {
    expect(
      validateProfile({ fullName: 'H', email: 'bad', mobile: 'abc', website: 'javascript:alert(1)', location: '', summary: '', socialLinks: [] }),
    ).toEqual({
      fullName: expect.any(String),
      email: expect.any(String),
      mobile: expect.any(String),
      website: expect.any(String),
    })
    expect(validateProfile({ ...profile, socialLinks: [] })).toEqual({})
  })

  it('submits normalized values (bare domains become https URLs, WhatsApp numbers become wa.me links)', async () => {
    vi.mocked(profileApi.update).mockImplementation(async (body) => ({ ...profile, ...body, photoUrl: null, updatedAt: '' }))
    render(
      <MemoryRouter>
        <MyProfilePage />
      </MemoryRouter>,
    )
    const website = await screen.findByLabelText(/personal website/i)
    await userEvent.type(website, 'harish.dev')
    await userEvent.click(screen.getByRole('button', { name: 'WhatsApp' }))
    await userEvent.type(screen.getByLabelText(/whatsapp link/i), '+91 98765 43210')
    await userEvent.click(screen.getAllByRole('button', { name: /save profile/i })[0]!)

    expect(profileApi.update).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Harish Baskar',
        website: 'https://harish.dev',
        socialLinks: [{ platform: 'WhatsApp', url: 'https://wa.me/919876543210' }],
      }),
    )
  })

  it('blocks submission when a field is invalid', async () => {
    render(
      <MemoryRouter>
        <MyProfilePage />
      </MemoryRouter>,
    )
    const email = await screen.findByLabelText(/public contact email/i)
    await userEvent.clear(email)
    await userEvent.type(email, 'not-an-email')
    await userEvent.click(screen.getAllByRole('button', { name: /save profile/i })[0]!)

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(profileApi.update).not.toHaveBeenCalled()
  })
})

describe('Mode form', () => {
  it('requires mandatory fields in repeatable sections and rejects unsafe URLs', () => {
    const form = emptyModeForm('Developer')
    form.workExperiences = [{ title: '', company: 'Acme', isCurrent: false }]
    form.projects = [{ title: 'Site', url: 'javascript:alert(1)' }]
    const errors = validateMode(toPayload(form))
    expect(errors['workExperiences.0.title']).toBe('Job title is required.')
    expect(errors['projects.0.url']).toBe('Enter a valid URL.')
  })

  it('cleans the payload: trims, nulls empty values and drops end date for current roles', () => {
    const form = emptyModeForm('HR')
    form.designation = '  HR Manager  '
    form.companyName = '   '
    form.gitHubUrl = 'github.com/me'
    form.workExperiences = [{ title: 'Lead', company: 'Acme', isCurrent: true, startDate: '2020-01-01', endDate: '2022-01-01' }]
    const payload = toPayload(form)
    expect(payload.designation).toBe('HR Manager')
    expect(payload.companyName).toBeNull()
    expect(payload.gitHubUrl).toBe('https://github.com/me')
    expect(payload.workExperiences[0]!.endDate).toBeNull()
    expect(payload.modeName).toBe('HR Manager')
  })
})

describe('QR code page', () => {
  it('shows the permanent public URL that the QR code encodes', async () => {
    vi.mocked(qrApi.info).mockResolvedValue({
      publicSlug: 'harish',
      permanentUrl: 'https://prolink.example/p/harish',
      qrReference: 'abc123',
      generatedAt: '2026-01-01T00:00:00Z',
      isPublic: true,
    })
    vi.mocked(qrApi.png).mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
    URL.createObjectURL = vi.fn(() => 'blob:qr')
    URL.revokeObjectURL = vi.fn()

    render(
      <MemoryRouter>
        <QrCodePage />
      </MemoryRouter>,
    )
    expect(await screen.findByText('https://prolink.example/p/harish')).toBeInTheDocument()
    expect(screen.getByText(/permanent · never changes/i)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^qr code: scan to open/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^qr widget: scan to open/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open public profile/i })).toHaveAttribute('href', 'https://prolink.example/p/harish')
    expect(screen.getByText('https://prolink.example/q/harish')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open my qr/i })).toHaveAttribute('href', 'https://prolink.example/q/harish')
  })
})
