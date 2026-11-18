import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ContactPage, { validateEnquiry } from './ContactPage'

const create = vi.fn()
vi.mock('../../api/endpoints', () => ({
  enquiryApi: { create: (...args: unknown[]) => create(...args) },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ContactPage />
    </MemoryRouter>,
  )
}

describe('ContactPage', () => {
  beforeEach(() => {
    create.mockReset()
  })

  it('shows validation errors and does not submit invalid input', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/email/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /send enquiry/i }))

    expect(screen.getByText('Please enter your name (2–100 characters).')).toBeInTheDocument()
    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('Subject must be 3–150 characters.')).toBeInTheDocument()
    expect(screen.getByText('Message must be 10–3000 characters.')).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()
  })

  it('submits a valid enquiry and shows the success state', async () => {
    create.mockResolvedValue({ id: '1', message: 'Thank you! We will get back to you shortly.' })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/full name/i), 'Priya Sharma')
    await user.type(screen.getByLabelText(/^email/i), 'priya@example.com')
    await user.type(screen.getByLabelText(/subject/i), 'Team onboarding')
    await user.type(screen.getByLabelText(/message/i), 'We would like to onboard 20 people.')
    await user.click(screen.getByRole('button', { name: /send enquiry/i }))

    expect(create).toHaveBeenCalledWith({
      name: 'Priya Sharma',
      email: 'priya@example.com',
      phone: undefined,
      subject: 'Team onboarding',
      message: 'We would like to onboard 20 people.',
    })
    expect(await screen.findByText('Message sent')).toBeInTheDocument()
    expect(screen.getByText('Thank you! We will get back to you shortly.')).toBeInTheDocument()
  })

  it('shows the server error when the API fails', async () => {
    // Shape of an axios error carrying the API's ProblemDetails response
    create.mockRejectedValue({ isAxiosError: true, response: { status: 503, data: { detail: 'Server unavailable' } } })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/full name/i), 'Priya Sharma')
    await user.type(screen.getByLabelText(/^email/i), 'priya@example.com')
    await user.type(screen.getByLabelText(/subject/i), 'Hello there')
    await user.type(screen.getByLabelText(/message/i), 'A message long enough.')
    await user.click(screen.getByRole('button', { name: /send enquiry/i }))

    expect(await screen.findByText('Server unavailable')).toBeInTheDocument()
  })
})

describe('validateEnquiry', () => {
  it('accepts a valid enquiry with optional phone omitted', () => {
    expect(
      validateEnquiry({ name: 'Al', email: 'a@b.co', phone: '', subject: 'Hey', message: '0123456789' }),
    ).toEqual({})
  })

  it('rejects an invalid phone number', () => {
    expect(
      validateEnquiry({ name: 'Al', email: 'a@b.co', phone: 'abc', subject: 'Hey', message: '0123456789' }).phone,
    ).toBeDefined()
  })
})
