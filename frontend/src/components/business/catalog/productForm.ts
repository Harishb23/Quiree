import { paiseToRupees, rupeesToPaise } from '../../../lib/business'
import type { CategoryAttribute, Product, ProductUpsertRequest, StockStatus } from '../../../types/business'

/** Editable product form; prices are kept as typed rupee strings. */
export interface ProductFormState {
  name: string
  sku: string
  productCategoryId: string
  description: string
  price: string
  discountPrice: string
  stock: StockStatus
  isAvailable: boolean
  isFeatured: boolean
  attributes: Record<string, string>
}

export type FormErrors = Record<string, string>

export function toProductForm(p?: Product | null): ProductFormState {
  return {
    name: p?.name ?? '',
    sku: p?.sku ?? '',
    productCategoryId: p?.productCategoryId ?? '',
    description: p?.description ?? '',
    price: paiseToRupees(p?.priceInPaise),
    discountPrice: paiseToRupees(p?.discountPriceInPaise),
    stock: p?.stock ?? 'InStock',
    isAvailable: p?.isAvailable ?? true,
    isFeatured: p?.isFeatured ?? false,
    attributes: { ...(p?.attributes ?? {}) },
  }
}

/** Validates a single attribute value the same way the server does. Returns an error message or null. */
export function validateAttribute(attr: CategoryAttribute, raw: string | undefined): string | null {
  const value = (raw ?? '').trim()
  if (!value) return attr.isRequired ? `${attr.label} is required.` : null
  switch (attr.inputType) {
    case 'Number':
      return /^\d+(\.\d+)?$/.test(value) ? null : `${attr.label} must be a number.`
    case 'Select':
      return attr.options.some((o) => o.toLowerCase() === value.toLowerCase()) ? null : `${attr.label}: choose one of the listed options.`
    case 'MultiSelect':
      return value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
        .every((v) => attr.options.some((o) => o.toLowerCase() === v.toLowerCase()))
        ? null
        : `${attr.label}: choose from the listed options.`
    case 'Boolean':
      return value === 'true' || value === 'false' ? null : `${attr.label} must be yes or no.`
    default:
      return value.length > 200 ? `${attr.label} must be 200 characters or fewer.` : null
  }
}

/** Client-side validation mirroring the API. Attribute errors are keyed `attr.<key>`. */
export function validateProductForm(form: ProductFormState, attributes: CategoryAttribute[]): FormErrors {
  const errors: FormErrors = {}
  if (!form.name.trim()) errors.name = 'Product name is required.'
  else if (form.name.trim().length > 150) errors.name = 'Keep the name under 150 characters.'
  if (form.sku.trim().length > 60) errors.sku = 'SKU must be 60 characters or fewer.'

  const price = rupeesToPaise(form.price)
  const discount = rupeesToPaise(form.discountPrice)
  if (Number.isNaN(price)) errors.priceInPaise = 'Enter a valid price, e.g. 1299 or 1299.50.'
  if (Number.isNaN(discount)) errors.discountPriceInPaise = 'Enter a valid discount price.'
  else if (discount != null && price == null) errors.discountPriceInPaise = 'Set a regular price before adding a discount price.'
  else if (discount != null && price != null && !Number.isNaN(price) && discount >= price)
    errors.discountPriceInPaise = 'Discount price must be lower than the regular price.'

  for (const attr of attributes) {
    const error = validateAttribute(attr, form.attributes[attr.key])
    if (error) errors[`attr.${attr.key}`] = error
  }
  return errors
}

/** Only attributes defined for the business's current category are sent (others are stale). */
export function toProductPayload(form: ProductFormState, attributes: CategoryAttribute[]): ProductUpsertRequest {
  const attrs: Record<string, string> = {}
  for (const a of attributes) {
    const v = (form.attributes[a.key] ?? '').trim()
    if (v) attrs[a.key] = v
  }
  return {
    name: form.name.trim(),
    sku: form.sku.trim() || null,
    productCategoryId: form.productCategoryId || null,
    description: form.description.trim() || null,
    priceInPaise: rupeesToPaise(form.price),
    discountPriceInPaise: rupeesToPaise(form.discountPrice),
    stock: form.stock,
    isAvailable: form.isAvailable,
    isFeatured: form.isFeatured,
    attributes: attrs,
  }
}

/** Builds a full update payload from a loaded product (used for quick toggles). */
export function productToPayload(p: Product, patch: Partial<ProductUpsertRequest> = {}): ProductUpsertRequest {
  return {
    name: p.name,
    sku: p.sku,
    productCategoryId: p.productCategoryId,
    description: p.description,
    priceInPaise: p.priceInPaise,
    discountPriceInPaise: p.discountPriceInPaise,
    stock: p.stock,
    isAvailable: p.isAvailable,
    isFeatured: p.isFeatured,
    attributes: p.attributes,
    ...patch,
  }
}

/** Toggles one option in a comma-separated multi-select value, keeping the options' order. */
export function toggleOption(current: string, option: string, options: string[]): string {
  const selected = new Set(
    current
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean),
  )
  const key = option.toLowerCase()
  if (selected.has(key)) selected.delete(key)
  else selected.add(key)
  return options.filter((o) => selected.has(o.toLowerCase())).join(',')
}
