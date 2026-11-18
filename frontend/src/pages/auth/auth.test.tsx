import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AxiosError, AxiosHeaders } from 'axios'
import { AuthProvider } from '../../context/AuthContext'
import { ProtectedRoute } from '../../components/routing/RouteGuards'
import { authApi } from '../../api/endpoints'
import { tokenStorage } from '../../lib/tokenStorage'
import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'
import type { AuthResponse } from '../../types/api'

vi.mock('../../api/endpoints', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    google: vi.fn(),
    me: vi.fn(),
    logout: vi.fn(),
    usernameAvailable: vi.fn().mockResolvedValue({ username: 'x', available: true, reason: null }),
  },
}))

const authResponse: AuthResponse = {
  accessToken: 'jwt-token',
  expiresAt: '2030-01-01T00:00:00Z',
  user: {
    id: 'u1',
    email: 'harish@example.com',
    fullName: 'Harish Baskar',
    photoUrl: null,
    role: 'User',
    publicSlug: 'harish',
    publicUrl: 'https://prolink.example/p/harish',
    hasPassword: true,
    hasGoogle: false,
  },
}

const apiError = (status: number, detail: string) =>
  new AxiosError(detail, 'ERR', undefined, undefined, {
    status,
    statusText: '',
    data: { detail },
    headers: {},
    config: { headers: new AxiosHeaders() },
  })

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <h1>Owner Dashboard</h1>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Authentication', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(authApi.login).mockReset()
    vi.mocked(authApi.register).mockReset()
  })

  it('redirects anonymous users from the dashboard to login', async () => {
    renderApp('/dashboard')
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.queryByText('Owner Dashboard')).not.toBeInTheDocument()
  })

  it('validates the login form before calling the API', async () => {
    renderApp('/login')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(authApi.login).not.toHaveBeenCalled()
  })

  it('stays on the login page and shows the error when credentials are rejected', async () => {
    vi.mocked(authApi.login).mockRejectedValue(apiError(401, 'Invalid email or password.'))
    renderApp('/login')
    await userEvent.type(screen.getByLabelText(/email/i), 'harish@example.com')
    await userEvent.type(screen.getByLabelText(/^password/i), 'wrong-pass1')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument()
    expect(screen.queryByText('Owner Dashboard')).not.toBeInTheDocument()
    expect(tokenStorage.get()).toBeNull()
  })

  it('navigates to the dashboard only after a successful login', async () => {
    vi.mocked(authApi.login).mockResolvedValue(authResponse)
    renderApp('/login')
    await userEvent.type(screen.getByLabelText(/email/i), 'harish@example.com')
    await userEvent.type(screen.getByLabelText(/^password/i), 'Passw0rd!')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    expect(await screen.findByText('Owner Dashboard')).toBeInTheDocument()
    expect(authApi.login).toHaveBeenCalledWith('harish@example.com', 'Passw0rd!')
    expect(tokenStorage.get()).toBe('jwt-token')
  })

  it('registers a new account and enters the dashboard', async () => {
    vi.mocked(authApi.register).mockResolvedValue(authResponse)
    renderApp('/register')
    await userEvent.type(screen.getByLabelText(/full name/i), 'Harish Baskar')
    await userEvent.type(screen.getByLabelText(/^email/i), 'harish@example.com')
    await userEvent.type(screen.getByLabelText(/^password/i), 'Passw0rd!')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Passw0rd!')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Owner Dashboard')).toBeInTheDocument()
    expect(authApi.register).toHaveBeenCalledWith({
      fullName: 'Harish Baskar',
      email: 'harish@example.com',
      password: 'Passw0rd!',
      username: undefined,
    })
  })

  it('rejects weak and mismatched passwords on registration', async () => {
    renderApp('/register')
    await userEvent.type(screen.getByLabelText(/full name/i), 'Harish Baskar')
    await userEvent.type(screen.getByLabelText(/^email/i), 'harish@example.com')
    await userEvent.type(screen.getByLabelText(/^password/i), 'short')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument()
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(authApi.register).not.toHaveBeenCalled()
  })
})
