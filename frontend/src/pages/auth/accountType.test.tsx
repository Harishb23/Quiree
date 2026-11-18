import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RegisterPage from './RegisterPage'
import { AccountArea } from '../../components/routing/RouteGuards'
import { accountTypeFromQuery, homeFor, pathAllowed, redirectAfterLogin } from '../../lib/accounts'
import type { CurrentUser, RegisterRequest } from '../../types/api'

const register = vi.fn()
let currentUser: Partial<CurrentUser> | null = null

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ register, loginWithGoogle: vi.fn(), user: currentUser, status: currentUser ? 'authenticated' : 'anonymous' }),
}))
vi.mock('../../api/endpoints', () => ({ authApi: { usernameAvailable: vi.fn().mockResolvedValue({ available: true }) } }))

describe('account routing rules', () => {
  it('sends each account type to its own home', () => {
    expect(homeFor('Personal')).toBe('/dashboard')
    expect(homeFor('Business')).toBe('/dashboard/business')
  })

  it('keeps business and personal areas apart', () => {
    expect(pathAllowed('/dashboard/business/abc/products', 'Business')).toBe(true)
    expect(pathAllowed('/dashboard/modes', 'Business')).toBe(false)
    expect(pathAllowed('/dashboard/modes', 'Personal')).toBe(true)
    expect(pathAllowed('/dashboard/business', 'Personal')).toBe(false)
  })

  it('returns to the requested page after login only when it is in the right area', () => {
    expect(redirectAfterLogin({ accountType: 'Business' }, '/dashboard/business/b1/enquiries')).toBe('/dashboard/business/b1/enquiries')
    expect(redirectAfterLogin({ accountType: 'Business' }, '/dashboard/modes')).toBe('/dashboard/business')
    expect(redirectAfterLogin({ accountType: 'Personal' }, undefined)).toBe('/dashboard')
  })

  it('reads ?type=business from marketing links', () => {
    expect(accountTypeFromQuery('?type=business')).toBe('Business')
    expect(accountTypeFromQuery('?type=Business')).toBe('Business')
    expect(accountTypeFromQuery('')).toBe('Personal')
  })
})

describe('registration', () => {
  beforeEach(() => {
    register.mockReset()
    currentUser = null
  })

  const renderRegister = (url = '/register') =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="register" element={<RegisterPage />} />
          <Route path="dashboard" element={<p>Personal home</p>} />
          <Route path="dashboard/business" element={<p>Business home</p>} />
        </Routes>
      </MemoryRouter>,
    )

  async function fillAndSubmit() {
    await userEvent.type(screen.getByLabelText(/name/i, { selector: 'input[autocomplete="name"]' }), 'Priya Raman')
    await userEvent.type(screen.getByLabelText(/^email/i), 'priya@example.com')
    await userEvent.type(screen.getByLabelText(/^password/i), 'Passw0rd!')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Passw0rd!')
    await userEvent.click(screen.getByRole('button', { name: /create .* account/i }))
  }

  it('creates a business account and opens the business area', async () => {
    register.mockImplementation(async (req: RegisterRequest) => ({ accountType: req.accountType }))
    renderRegister()
    await userEvent.click(screen.getByLabelText(/business/i, { selector: 'input[type="radio"]' }))
    expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument()
    await fillAndSubmit()
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ accountType: 'Business', username: undefined }))
    expect(await screen.findByText('Business home')).toBeInTheDocument()
  })

  it('defaults to a personal account, or business from ?type=business', async () => {
    register.mockImplementation(async (req: RegisterRequest) => ({ accountType: req.accountType }))
    const { unmount } = renderRegister()
    expect(screen.getByLabelText(/personal/i, { selector: 'input[type="radio"]' })).toBeChecked()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    unmount()

    renderRegister('/register?type=business')
    expect(screen.getByLabelText(/business/i, { selector: 'input[type="radio"]' })).toBeChecked()
    await fillAndSubmit()
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ accountType: 'Business' }))
  })
})

describe('account areas', () => {
  const renderArea = (url: string) =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route element={<AccountArea type="Personal" />}>
            <Route path="dashboard/modes" element={<p>Personal modes</p>} />
          </Route>
          <Route element={<AccountArea type="Business" />}>
            <Route path="dashboard/business" element={<p>Business list</p>} />
          </Route>
          <Route path="dashboard" element={<p>Personal home</p>} />
        </Routes>
      </MemoryRouter>,
    )

  it('redirects a business account away from personal pages', async () => {
    currentUser = { accountType: 'Business' }
    renderArea('/dashboard/modes')
    expect(await screen.findByText('Business list')).toBeInTheDocument()
  })

  it('redirects a personal account away from business pages', async () => {
    currentUser = { accountType: 'Personal' }
    renderArea('/dashboard/business')
    expect(await screen.findByText('Personal home')).toBeInTheDocument()
  })
})
