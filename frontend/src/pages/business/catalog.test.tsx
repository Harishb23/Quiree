import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { useState } from 'react'
import { businessCatalogApi } from '../../api/businessApi'
import { BusinessProvider } from './BusinessShell'
import ProductsPage from './ProductsPage'
import OffersPage from './OffersPage'
import { AttributeFields } from '../../components/business/catalog/AttributeFields'
import { toProductForm, toProductPayload, toggleOption, validateProductForm } from '../../components/business/catalog/productForm'
import type { BusinessDetail, CategoryAttribute, Offer, Product } from '../../types/business'

vi.mock('../../api/businessApi', () => ({
  businessCatalogApi: {
    products: vi.fn(),
    productCategories: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    offers: vi.fn(),
    updateOffer: vi.fn(),
  },
  businessCategoriesApi: { attributes: vi.fn() },
}))

const business = {
  id: 'b1',
  name: 'Sole Street',
  slug: 'sole-street',
  categoryId: 1,
  categoryName: 'Footwear and Shoe Shops',
  myRole: 'Owner',
} as BusinessDetail

const attrs: CategoryAttribute[] = [
  { id: 1, key: 'brand', label: 'Brand', inputType: 'Text', options: [], isRequired: true },
  { id: 2, key: 'weight', label: 'Weight', inputType: 'Number', options: [], isRequired: false },
  { id: 3, key: 'gender', label: 'Gender', inputType: 'Select', options: ['Men', 'Women'], isRequired: false },
  { id: 4, key: 'shoe_size', label: 'Shoe Size', inputType: 'MultiSelect', options: ['UK 7', 'UK 8', 'UK 9'], isRequired: false },
  { id: 5, key: 'waterproof', label: 'Waterproof', inputType: 'Boolean', options: [], isRequired: false },
]

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Air Runner',
  sku: 'AR-1',
  productCategoryId: null,
  productCategoryName: null,
  description: null,
  priceInPaise: 499900,
  discountPriceInPaise: 399900,
  currency: 'INR',
  stock: 'InStock',
  isAvailable: true,
  isFeatured: true,
  attributes: {},
  images: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

const offer = (id: string, state: Offer['state']): Offer => ({
  id,
  title: `${state} offer`,
  description: null,
  discountPercent: 10,
  discountAmountInPaise: null,
  startDate: null,
  endDate: null,
  isActive: state !== 'Inactive',
  isFeatured: false,
  bannerUrl: null,
  state,
  updatedAt: '2026-01-01T00:00:00Z',
})

const renderInBusiness = (ui: React.ReactNode) =>
  render(
    <MemoryRouter>
      <BusinessProvider business={business}>{ui}</BusinessProvider>
    </MemoryRouter>,
  )

describe('Category attribute fields', () => {
  function Harness() {
    const [values, setValues] = useState<Record<string, string>>({})
    return (
      <>
        <AttributeFields attributes={attrs} values={values} onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))} />
        <output data-testid="values">{JSON.stringify(values)}</output>
      </>
    )
  }

  it('renders the right control for each input type and stores API-format values', async () => {
    render(<Harness />)
    expect(screen.getByLabelText(/brand/i)).toHaveAttribute('maxLength', '200')
    expect(screen.getByLabelText(/weight/i)).toHaveAttribute('inputMode', 'decimal')
    const gender = screen.getByLabelText(/gender/i)
    expect(gender.tagName).toBe('SELECT')

    await userEvent.selectOptions(gender, 'Women')
    const sizes = screen.getByRole('group', { name: /shoe size/i })
    await userEvent.click(within(sizes).getByRole('button', { name: 'UK 9' }))
    await userEvent.click(within(sizes).getByRole('button', { name: 'UK 7' }))
    await userEvent.click(screen.getByRole('switch', { name: /waterproof/i }))

    expect(JSON.parse(screen.getByTestId('values').textContent!)).toEqual({ gender: 'Women', shoe_size: 'UK 7,UK 9', waterproof: 'true' })
    expect(within(sizes).getByRole('button', { name: 'UK 7' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('validates required, numeric and option values like the server', () => {
    const form = { ...toProductForm(), name: 'Runner', attributes: { weight: 'heavy', gender: 'Martian' } }
    const errors = validateProductForm(form, attrs)
    expect(errors['attr.brand']).toMatch(/required/)
    expect(errors['attr.weight']).toMatch(/number/)
    expect(errors['attr.gender']).toMatch(/options/)
    expect(validateProductForm({ ...form, attributes: { brand: 'Nike', weight: '1.5', gender: 'men' } }, attrs)).toEqual({})
  })

  it('keeps multi-select values in option order when toggling', () => {
    expect(toggleOption('UK 9', 'UK 7', ['UK 7', 'UK 8', 'UK 9'])).toBe('UK 7,UK 9')
    expect(toggleOption('UK 7,UK 9', 'uk 7', ['UK 7', 'UK 8', 'UK 9'])).toBe('UK 9')
  })
})

describe('Product form pricing', () => {
  it('requires a name and rejects invalid or too-high discounts', () => {
    expect(validateProductForm(toProductForm(), []).name).toBeDefined()
    const base = { ...toProductForm(), name: 'Runner' }
    expect(validateProductForm({ ...base, price: 'abc' }, []).priceInPaise).toBeDefined()
    expect(validateProductForm({ ...base, discountPrice: '100' }, []).discountPriceInPaise).toMatch(/regular price/)
    expect(validateProductForm({ ...base, price: '1000', discountPrice: '1200' }, []).discountPriceInPaise).toMatch(/lower/)
    expect(validateProductForm({ ...base, price: '1,299.50', discountPrice: '999' }, [])).toEqual({})
  })

  it('converts rupees to paise and drops attributes not defined for the category', () => {
    const payload = toProductPayload({ ...toProductForm(), name: ' Runner ', price: '1,299.50', attributes: { brand: 'Nike', stale: 'x' } }, attrs)
    expect(payload).toMatchObject({ name: 'Runner', priceInPaise: 129950, discountPriceInPaise: null, attributes: { brand: 'Nike' } })
  })
})

describe('Products page', () => {
  beforeEach(() => {
    vi.mocked(businessCatalogApi.productCategories).mockResolvedValue([])
  })

  it('renders products from the API with discount pricing', async () => {
    vi.mocked(businessCatalogApi.products).mockResolvedValue({ items: [product()], total: 1, page: 1, pageSize: 12 })
    renderInBusiness(<ProductsPage />)
    const card = (await screen.findByRole('heading', { name: 'Air Runner' })).closest('article')!
    expect(within(card).getByText('20% off')).toBeInTheDocument()
    expect(within(card).getByText('In stock')).toBeInTheDocument()
    expect(within(card).getByText('Featured')).toBeInTheDocument()
    expect(businessCatalogApi.products).toHaveBeenCalledWith('b1', expect.objectContaining({ page: 1, pageSize: 12, sort: 'newest' }))
  })

  it('shows the empty state when the catalogue is empty', async () => {
    vi.mocked(businessCatalogApi.products).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 12 })
    renderInBusiness(<ProductsPage />)
    expect(await screen.findByText('No products yet')).toBeInTheDocument()
  })

  it('toggles featured with a full update payload', async () => {
    vi.mocked(businessCatalogApi.products).mockResolvedValue({ items: [product()], total: 1, page: 1, pageSize: 12 })
    vi.mocked(businessCatalogApi.updateProduct).mockResolvedValue(product({ isFeatured: false }))
    renderInBusiness(<ProductsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Unfeature Air Runner' }))
    expect(businessCatalogApi.updateProduct).toHaveBeenCalledWith('b1', 'p1', expect.objectContaining({ isFeatured: false, name: 'Air Runner', priceInPaise: 499900 }))
  })
})

describe('Offers page', () => {
  it('filters offers by state tab with counts', async () => {
    vi.mocked(businessCatalogApi.offers).mockResolvedValue([offer('1', 'Live'), offer('2', 'Live'), offer('3', 'Expired'), offer('4', 'Scheduled')])
    renderInBusiness(<OffersPage />)
    expect(await screen.findAllByRole('heading', { name: /offer$/ })).toHaveLength(4)

    await userEvent.click(screen.getByRole('tab', { name: /^Live/ }))
    expect(screen.getAllByRole('heading', { name: 'Live offer' })).toHaveLength(2)
    expect(screen.queryByRole('heading', { name: 'Expired offer' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: /^Inactive/ }))
    expect(screen.getByText('No inactive offers')).toBeInTheDocument()
  })
})
