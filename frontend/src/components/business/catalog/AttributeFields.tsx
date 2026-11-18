import { useId } from 'react'
import { SelectField, TextField } from '../../ui/Field'
import { Toggle } from '../../ui/Surface'
import type { CategoryAttribute } from '../../../types/business'
import { toggleOption, type FormErrors } from './productForm'
import styles from './Catalog.module.scss'

/**
 * Renders the category-specific product fields (e.g. Shoe Size for footwear, Veg / Non-Veg for restaurants).
 * Values use the API's string format: MultiSelect is comma-separated, Boolean is "true" / "false".
 */
export function AttributeFields({
  attributes,
  values,
  errors = {},
  onChange,
}: {
  attributes: CategoryAttribute[]
  values: Record<string, string>
  errors?: FormErrors
  onChange: (key: string, value: string) => void
}) {
  if (!attributes.length) return null
  return (
    <div className={styles.attrGrid}>
      {attributes.map((attr) => (
        <AttributeField
          key={attr.key}
          attr={attr}
          value={values[attr.key] ?? ''}
          error={errors[`attr.${attr.key}`]}
          onChange={(v) => onChange(attr.key, v)}
        />
      ))}
    </div>
  )
}

function AttributeField({
  attr,
  value,
  error,
  onChange,
}: {
  attr: CategoryAttribute
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  const labelId = useId()

  switch (attr.inputType) {
    case 'Select':
      return (
        <SelectField
          label={attr.label}
          required={attr.isRequired}
          value={attr.options.find((o) => o.toLowerCase() === value.toLowerCase()) ?? ''}
          error={error}
          onChange={(e) => onChange(e.target.value)}
          options={[{ value: '', label: attr.isRequired ? 'Select…' : 'Not specified' }, ...attr.options.map((o) => ({ value: o, label: o }))]}
        />
      )
    case 'MultiSelect': {
      const selected = value
        .split(',')
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean)
      return (
        <div className={styles.attrWide} role="group" aria-labelledby={labelId}>
          <span id={labelId} className={styles.fieldLabel}>
            {attr.label}
            {attr.isRequired && <span className={styles.requiredMark} aria-hidden> *</span>}
          </span>
          <div className={styles.chips}>
            {attr.options.map((o) => (
              <button
                key={o}
                type="button"
                className={styles.chipToggle}
                aria-pressed={selected.includes(o.toLowerCase())}
                onClick={() => onChange(toggleOption(value, o, attr.options))}
              >
                {o}
              </button>
            ))}
          </div>
          {error && (
            <p className={styles.fieldError} role="alert">
              {error}
            </p>
          )}
        </div>
      )
    }
    case 'Boolean':
      return (
        <div>
          <div className={styles.boolField}>
            <span id={labelId}>
              {attr.label}
              {attr.isRequired && <span className={styles.requiredMark} aria-hidden> *</span>}
            </span>
            <Toggle checked={value === 'true'} label={attr.label} onChange={(v) => onChange(v ? 'true' : 'false')} />
          </div>
          {error && (
            <p className={styles.fieldError} role="alert">
              {error}
            </p>
          )}
        </div>
      )
    case 'Number':
      return (
        <TextField
          label={attr.label}
          required={attr.isRequired}
          inputMode="decimal"
          value={value}
          error={error}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    default:
      return (
        <TextField
          label={attr.label}
          required={attr.isRequired}
          maxLength={200}
          value={value}
          error={error}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}
