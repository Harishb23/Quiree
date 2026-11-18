import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import styles from './Field.module.scss'

interface FieldShellProps {
  label?: string
  hint?: ReactNode
  error?: string
  required?: boolean
  className?: string
  children: (id: string, describedBy: string | undefined) => ReactNode
}

function FieldShell({ label, hint, error, required, className, children }: FieldShellProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={[styles.field, error && styles.hasError, className].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && <span className={styles.required} aria-hidden> *</span>}
        </label>
      )}
      {children(id, describedBy)}
      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  label?: string
  hint?: ReactNode
  error?: string
  icon?: ReactNode
  className?: string
}

export function TextField({ label, hint, error, icon, className, required, ...input }: TextFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} className={className}>
      {(id, describedBy) => (
        <div className={styles.control}>
          {icon && <span className={styles.icon}>{icon}</span>}
          <input
            id={id}
            className={[styles.input, icon && styles.withIcon].filter(Boolean).join(' ')}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            required={required}
            {...input}
          />
        </div>
      )}
    </FieldShell>
  )
}

type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & {
  label?: string
  hint?: ReactNode
  error?: string
  className?: string
}

export function TextArea({ label, hint, error, className, required, rows = 4, ...textarea }: TextAreaProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} className={className}>
      {(id, describedBy) => (
        <textarea
          id={id}
          rows={rows}
          className={[styles.input, styles.textarea].join(' ')}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          required={required}
          {...textarea}
        />
      )}
    </FieldShell>
  )
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> & {
  label?: string
  hint?: ReactNode
  error?: string
  className?: string
  options: { value: string; label: string }[]
}

export function SelectField({ label, hint, error, className, options, required, ...select }: SelectFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} className={className}>
      {(id, describedBy) => (
        <select
          id={id}
          className={[styles.input, styles.select].join(' ')}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          required={required}
          {...select}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  )
}
