import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import BusinessWizardPage from './BusinessWizardPage'
import { BusinessProvider } from './BusinessShell'
import { businessApi, businessCategoriesApi } from '../../api/businessApi'
import { applyMondayToWeekdays, validateSlug, validateStep } from '../../components/business/profile/businessForm'
import { BusinessCategorySelector } from '../../components/business/profile/BusinessCategorySelector'
import { BusinessWorkingHours } from '../../components/business/profile/BusinessWorkingHours'
import { defaultWorkingHours, emptyBusinessForm } from '../../lib/business'
import type { BusinessCategory, BusinessDetail } from '../../types/business'

vi.mock('../../api/businessApi', () => ({
  businessApi: {
    create: vi.fn(),
    update: vi.fn(),
    publish: vi.fn(),
    preview: vi.fn(),
    uploadLogo: vi.fn(),
    removeLogo: vi.fn(),
    uploadCover: vi.fn(),
    removeCover: vi.fn(),
  },
  businessCategoriesApi: { list: vi.fn() },
}))

// The storefront itself is covered by its own tests; here we only need to know the preview renders.
vi.mock('../../components/business/storefront/BusinessStorefront', () => ({
  BusinessStorefront: ({ business }: { business: { name: string } }) => <div>Storefront preview: {business.name}</div>,
}))

const categories: BusinessCategory[] = [
  { id: 1, key: 'footwear', name: 'Footwear and Shoe Shops', icon: 'footprints', subcategories: [{ id: 101, name: "Men's Footwear" }] },
  { id: 2, key: 'flowers', name: 'Flower Shops', icon: 'flower-2', subcategories: [{ id: 201, name: 'Florist' }] },
]

const detail: BusinessDetail = {
  ...emptyBusinessForm(),
  id: 'b1',
  slug: 'sole-street',
  name: 'Sole Street',
  categoryId: 1,
  subcategoryId: null,
  categoryName: 'Footwear and Shoe Shops',
  categoryIcon: 'footprints',
  subcategoryName: null,
  logoUrl: null,
  coverUrl: null,
  timeZone: 'Asia/Kolkata',
  status: 'Draft',
  isVerified: false,
  publishedAt: null,
  publicUrl: 'https://prolink.test/business/sole-street',
  myRole: 'Owner',
  completion: { percent: 20, missing: [] },
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
}

beforeEach(() => {
  vi.mocked(businessCategoriesApi.list).mockResolvedValue(categories)
  vi.mocked(businessApi.preview).mockRejectedValue(new Error('no preview'))
  vi.mocked(businessApi.create).mockReset()
  vi.mocked(businessApi.update).mockReset()
  vi.mocked(businessApi.publish).mockReset()
})

describe('validateStep', () => {
  it('requires a name and category, and checks contact formats', () => {
    const errors = validateStep(1, { ...emptyBusinessForm(), phone: 'call me', email: 'nope', yearEstablished: 1700 })
    expect(Object.keys(errors).sort()).toEqual(['categoryId', 'email', 'name', 'phone', 'yearEstablished'])
    expect(validateStep(1, { ...emptyBusinessForm(), name: 'Sole Street', categoryId: 1, phone: '+91 98765 43210' })).toEqual({})
  })

  it('requires both coordinates together and a safe maps link', () => {
    expect(validateStep(2, { ...emptyBusinessForm(), latitude: 13.08 })).toHaveProperty('latitude')
    expect(validateStep(2, { ...emptyBusinessForm(), mapsUrl: 'javascript:alert(1)' })).toHaveProperty('mapsUrl')
    expect(validateStep(2, { ...emptyBusinessForm(), latitude: 13.08, longitude: 80.27, mapsUrl: 'maps.app.goo.gl/x' })).toEqual({})
  })

  it('rejects open days without valid, different times and duplicate special dates', () => {
    const hours = defaultWorkingHours().map((h) => (h.day === 'Monday' ? { ...h, opens: '10:00', closes: '10:00' } : h))
    const errors = validateStep(3, {
      ...emptyBusinessForm(),
      workingHours: hours,
      specialHours: [
        { date: '2030-01-01', isClosed: true, opens: null, closes: null, note: null },
        { date: '2030-01-01', isClosed: true, opens: null, closes: null, note: null },
      ],
    })
    expect(errors).toHaveProperty('hours.Monday')
    expect(errors).toHaveProperty('special.1')
  })

  it('accepts bare domains but rejects unsafe links, and checks customisation', () => {
    expect(validateStep(4, { ...emptyBusinessForm(), website: 'yourshop.com' })).toEqual({})
    expect(validateStep(4, { ...emptyBusinessForm(), socialLinks: [{ platform: 'Instagram', label: null, url: 'javascript:x' }] })).toHaveProperty('social.0')
    expect(validateStep(5, { ...emptyBusinessForm(), brandColor: 'purple', featuredSections: [] })).toEqual({
      brandColor: expect.any(String),
      featuredSections: expect.any(String),
    })
  })

  it('mirrors the server slug rules', () => {
    expect(validateSlug('sole-street')).toBeNull()
    expect(validateSlug('ab')).not.toBeNull()
    expect(validateSlug('-bad')).not.toBeNull()
    expect(validateSlug('double--hyphen')).not.toBeNull()
  })
})

describe('BusinessCategorySelector', () => {
  it('selects a category, resets the subcategory, and picks a subcategory', async () => {
    const onChange = vi.fn()
    render(<BusinessCategorySelector categories={categories} categoryId={1} subcategoryId={101} onChange={onChange} />)
    expect(screen.getByRole('button', { name: /footwear/i })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: /flower shops/i }))
    expect(onChange).toHaveBeenLastCalledWith(2, null)

    await userEvent.selectOptions(screen.getByLabelText(/subcategory/i), '')
    expect(onChange).toHaveBeenLastCalledWith(1, null)
  })
})

describe('BusinessWorkingHours', () => {
  it('copies Monday’s hours to Tuesday–Friday only', async () => {
    const hours = defaultWorkingHours().map((h) => (h.day === 'Monday' ? { ...h, opens: '09:30', closes: '18:00' } : h))
    expect(applyMondayToWeekdays(hours).find((h) => h.day === 'Friday')).toMatchObject({ opens: '09:30', closes: '18:00' })
    expect(applyMondayToWeekdays(hours).find((h) => h.day === 'Saturday')).toMatchObject({ opens: '10:00' })

    const onHours = vi.fn()
    render(<BusinessWorkingHours hours={hours} special={[]} errors={{}} onHours={onHours} onSpecial={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /copy monday/i }))
    expect(onHours.mock.calls[0][0].find((h: { day: string }) => h.day === 'Wednesday')).toMatchObject({ opens: '09:30', closes: '18:00' })
  })
})

describe('Business wizard', () => {
  it('creates a draft from step 1 and continues to step 2 of the saved business', async () => {
    vi.mocked(businessApi.create).mockResolvedValue({ ...detail, id: 'new-id' })
    render(
      <MemoryRouter initialEntries={['/dashboard/business/new']}>
        <Routes>
          <Route path="/dashboard/business/new" element={<BusinessWizardPage />} />
          <Route path="/dashboard/business/:businessId/profile" element={<div>edit route</div>} />
        </Routes>
      </MemoryRouter>,
    )

    // Validation blocks an empty step.
    await userEvent.click(await screen.findByRole('button', { name: /save & continue/i }))
    expect(await screen.findByText(/enter your business name/i)).toBeInTheDocument()
    expect(businessApi.create).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText(/business name/i), '  Sole Street  ')
    await userEvent.click(screen.getByRole('button', { name: /footwear/i }))
    await userEvent.click(screen.getByRole('button', { name: /save & continue/i }))

    expect(businessApi.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Sole Street', categoryId: 1, subcategoryId: null }))
    expect(await screen.findByText('edit route')).toBeInTheDocument()
  })

  it('lets you pick a logo before saving and uploads it once the business is created', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:logo-preview')
    URL.revokeObjectURL = vi.fn()
    vi.mocked(businessApi.create).mockResolvedValue({ ...detail, id: 'new-id' })
    vi.mocked(businessApi.uploadLogo).mockReset().mockResolvedValue({ ...detail, id: 'new-id', logoUrl: '/uploads/business/logo.png' })
    render(
      <MemoryRouter initialEntries={['/dashboard/business/new']}>
        <Routes>
          <Route path="/dashboard/business/new" element={<BusinessWizardPage />} />
          <Route path="/dashboard/business/:businessId/profile" element={<div>edit route</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await userEvent.type(await screen.findByLabelText(/business name/i), 'Sole Street')
    await userEvent.click(screen.getByRole('button', { name: /footwear/i }))
    // The logo drop zone is usable straight away — no "save first".
    const logoInput = screen.getAllByLabelText(/click to upload/i, { selector: 'input[type=file]' })[0]!
    await userEvent.upload(logoInput, new File(['x'], 'logo.png', { type: 'image/png' }))
    expect(await screen.findByText(/photo will upload when you save/i)).toBeInTheDocument()
    expect(businessApi.uploadLogo).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: /save & continue/i }))
    expect(await screen.findByText('edit route')).toBeInTheDocument()
    expect(businessApi.uploadLogo).toHaveBeenCalledWith('new-id', expect.any(File))
  })

  it('keeps the changes and shows the server message when publishing fails', async () => {
    vi.mocked(businessApi.update).mockResolvedValue(detail)
    vi.mocked(businessApi.publish).mockRejectedValue(new Error('Add a phone, WhatsApp or email contact and a city before publishing.'))
    render(
      <MemoryRouter initialEntries={['/dashboard/business/b1/profile?step=5']}>
        <BusinessProvider business={detail}>
          <Routes>
            <Route path="/dashboard/business/:businessId/profile" element={<BusinessWizardPage />} />
          </Routes>
        </BusinessProvider>
      </MemoryRouter>,
    )

    await userEvent.click(await screen.findByRole('button', { name: /publish profile/i }))
    expect(businessApi.update).toHaveBeenCalledWith('b1', expect.objectContaining({ name: 'Sole Street' }))
    expect(await screen.findByText(/before publishing/i)).toBeInTheDocument()
    expect(screen.getAllByText(/storefront preview: sole street/i).length).toBeGreaterThan(0)
  })
})
