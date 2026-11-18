import type { ReactNode } from 'react'
import { CardHeader, GlassCard, Toggle } from '../../ui/Surface'
import { SelectField, TextArea, TextField } from '../../ui/Field'
import { Spinner } from '../../ui/Feedback'
import { discountPercent, rupeesToPaise, STOCK_LABELS } from '../../../lib/business'
import type { CategoryAttribute, ProductCategory, StockStatus } from '../../../types/business'
import { AttributeFields } from './AttributeFields'
import type { FormErrors, ProductFormState } from './productForm'
import shared from '../../../pages/dashboard/Dashboard.module.scss'
import styles from './Catalog.module.scss'

/** Product details, pricing, availability and category-specific attributes. Images are managed separately. */
export function BusinessProductForm({
  form,
  errors,
  categories,
  attributes,
  attributesLoading,
  categoryName,
  onChange,
  aside,
}: {
  form: ProductFormState
  errors: FormErrors
  categories: ProductCategory[]
  attributes: CategoryAttribute[]
  attributesLoading?: boolean
  /** Business category name, e.g. "Footwear and Shoe Shops". */
  categoryName: string
  onChange: (patch: Partial<ProductFormState>) => void
  /** Extra column content (e.g. image manager). */
  aside?: ReactNode
}) {
  const price = rupeesToPaise(form.price)
  const discount = rupeesToPaise(form.discountPrice)
  const off = price != null && discount != null && !Number.isNaN(price) && !Number.isNaN(discount) ? discountPercent(price, discount) : null

  return (
    <div className={styles.formSections}>
      <div className={shared.stack}>
        <GlassCard>
          <CardHeader title="Product details" subtitle="What customers see on your storefront." />
          <div className={shared.formGrid}>
            <TextField
              className={shared.span2}
              label="Product name"
              required
              maxLength={150}
              value={form.name}
              error={errors.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
            <TextField
              label="Product code / SKU"
              maxLength={60}
              value={form.sku}
              error={errors.sku}
              hint="Optional. Must be unique in your catalogue."
              onChange={(e) => onChange({ sku: e.target.value })}
            />
            <SelectField
              label="Product category"
              value={form.productCategoryId}
              error={errors.productCategoryId}
              onChange={(e) => onChange({ productCategoryId: e.target.value })}
              options={[{ value: '', label: 'Uncategorised' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
            />
            <TextArea
              className={shared.span2}
              label="Description"
              rows={4}
              maxLength={3000}
              value={form.description}
              error={errors.description}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </div>
        </GlassCard>

        <GlassCard>
          <CardHeader title={`${categoryName} details`} subtitle="Fields tailored to your type of business." />
          {attributesLoading ? (
            <Spinner />
          ) : attributes.length ? (
            <AttributeFields
              attributes={attributes}
              values={form.attributes}
              errors={errors}
              onChange={(key, value) => onChange({ attributes: { ...form.attributes, [key]: value } })}
            />
          ) : (
            <p className={shared.muted}>There are no extra fields for this category.</p>
          )}
        </GlassCard>
      </div>

      <div className={shared.stack}>
        <GlassCard>
          <CardHeader title="Pricing" subtitle="Leave the price empty to show “Price on request”." />
          <div className={shared.stack} style={{ gap: 14 }}>
            <TextField
              label="Regular price (₹)"
              inputMode="decimal"
              placeholder="e.g. 1299"
              value={form.price}
              error={errors.priceInPaise}
              onChange={(e) => onChange({ price: e.target.value })}
            />
            <TextField
              label="Discount price (₹)"
              inputMode="decimal"
              placeholder="Optional"
              value={form.discountPrice}
              error={errors.discountPriceInPaise}
              hint={off ? <span className={styles.priceHint}>{off}% off the regular price</span> : undefined}
              onChange={(e) => onChange({ discountPrice: e.target.value })}
            />
          </div>
        </GlassCard>

        <GlassCard>
          <CardHeader title="Availability" />
          <div className={shared.stack} style={{ gap: 12 }}>
            <SelectField
              label="Stock"
              value={form.stock}
              onChange={(e) => onChange({ stock: e.target.value as StockStatus })}
              options={Object.entries(STOCK_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <div className={styles.toggleRow}>
              <div>
                <strong>Show on storefront</strong>
                <span>Hidden products stay in your catalogue only.</span>
              </div>
              <Toggle checked={form.isAvailable} label="Show on storefront" onChange={(v) => onChange({ isAvailable: v })} />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <strong>Featured product</strong>
                <span>Featured products appear first.</span>
              </div>
              <Toggle checked={form.isFeatured} label="Featured product" onChange={(v) => onChange({ isFeatured: v })} />
            </div>
          </div>
        </GlassCard>

        {aside}
      </div>
    </div>
  )
}
