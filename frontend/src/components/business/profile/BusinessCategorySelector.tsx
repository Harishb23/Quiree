import { CategoryIcon } from '../CategoryIcon'
import { SelectField } from '../../ui/Field'
import type { BusinessCategory } from '../../../types/business'
import styles from './Profile.module.scss'

/** Category card grid plus a subcategory picker for the chosen category. */
export function BusinessCategorySelector({
  categories,
  categoryId,
  subcategoryId,
  onChange,
  error,
}: {
  categories: BusinessCategory[]
  categoryId: number
  subcategoryId: number | null
  onChange: (categoryId: number, subcategoryId: number | null) => void
  error?: string
}) {
  const selected = categories.find((c) => c.id === categoryId)
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>
        Business category <span className={styles.required}>*</span>
      </legend>
      <div className={styles.categoryGrid} role="group" aria-label="Business category">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={c.id === categoryId}
            className={[styles.categoryCard, c.id === categoryId && styles.categoryActive].filter(Boolean).join(' ')}
            // Changing category resets the subcategory, which belongs to the old category.
            onClick={() => c.id !== categoryId && onChange(c.id, null)}
          >
            <span className={styles.categoryIcon}>
              <CategoryIcon name={c.icon} size={20} />
            </span>
            <span>{c.name}</span>
          </button>
        ))}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {selected && selected.subcategories.length > 0 && (
        <SelectField
          label="Subcategory"
          value={subcategoryId ? String(subcategoryId) : ''}
          onChange={(e) => onChange(selected.id, e.target.value ? Number(e.target.value) : null)}
          options={[{ value: '', label: 'Choose a subcategory (optional)' }, ...selected.subcategories.map((s) => ({ value: String(s.id), label: s.name }))]}
        />
      )}
    </fieldset>
  )
}
