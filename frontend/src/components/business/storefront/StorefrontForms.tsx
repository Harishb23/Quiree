import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, Send, Star } from 'lucide-react'
import { publicBusinessApi } from '../../../api/businessApi'
import { getErrorMessage, getFieldErrors } from '../../../api/client'
import { Button } from '../../ui/Button'
import { Alert } from '../../ui/Feedback'
import { SelectField, TextArea, TextField } from '../../ui/Field'
import styles from './Storefront.module.scss'

export interface RelatedOption {
  /** "product:{id}" or "service:{id}" */
  value: string
  label: string
}

export interface EnquiryValues {
  customerName: string
  phone: string
  email: string
  subject: string
  message: string
  related: string
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^[0-9+()\-\s]{6,30}$/

/** Mirrors the server's rules so customers get instant feedback. */
export function validateEnquiry(v: EnquiryValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!v.customerName.trim()) errors.customerName = 'Please enter your name.'
  if (!v.phone.trim() && !v.email.trim()) errors.phone = 'Share a phone number or email so the business can reply.'
  if (v.phone.trim() && !PHONE.test(v.phone.trim())) errors.phone = 'Enter a valid phone number.'
  if (v.email.trim() && !EMAIL.test(v.email.trim())) errors.email = 'Enter a valid email address.'
  if (!v.subject.trim()) errors.subject = 'Please add a subject.'
  if (v.message.trim().length < 5) errors.message = 'Please write a short message (at least 5 characters).'
  return errors
}

export function EnquiryForm({
  slug,
  businessName,
  options,
  preset,
  disabled,
}: {
  slug: string
  businessName: string
  options: RelatedOption[]
  /** Set when the customer tapped "Enquire" on a product or service. */
  preset?: { related: string; subject: string; nonce: number } | null
  disabled?: boolean
}) {
  const empty: EnquiryValues = { customerName: '', phone: '', email: '', subject: '', message: '', related: '' }
  const [values, setValues] = useState<EnquiryValues>(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    if (!preset) return
    setDone(null)
    setValues((v) => ({ ...v, related: preset.related, subject: v.subject || preset.subject }))
  }, [preset])

  const set = (key: keyof EnquiryValues) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (disabled) return
    const found = validateEnquiry(values)
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    setServerError(null)
    const [kind, id] = values.related.split(':')
    try {
      const result = await publicBusinessApi.enquire(slug, {
        customerName: values.customerName.trim(),
        phone: values.phone.trim() || null,
        email: values.email.trim() || null,
        subject: values.subject.trim(),
        message: values.message.trim(),
        productId: kind === 'product' ? id : null,
        serviceId: kind === 'service' ? id : null,
      })
      setDone(result.message)
      setValues(empty)
    } catch (err) {
      setErrors(getFieldErrors(err))
      setServerError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className={styles.success} role="status">
        <CheckCircle2 aria-hidden />
        <div>
          <strong>Enquiry sent to {businessName}</strong>
          <p>{done}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setDone(null)}>
          Send another
        </Button>
      </div>
    )
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate aria-label="Send an enquiry">
      {disabled && <Alert tone="info">Forms are disabled in preview. Customers can send enquiries once you publish.</Alert>}
      {serverError && <Alert tone="error">{serverError}</Alert>}
      <div className={styles.formGrid}>
        <TextField label="Your name" required value={values.customerName} onChange={set('customerName')} error={errors.customerName} disabled={disabled} autoComplete="name" maxLength={100} />
        <TextField label="Phone" type="tel" value={values.phone} onChange={set('phone')} error={errors.phone} disabled={disabled} autoComplete="tel" inputMode="tel" maxLength={30} />
        <TextField label="Email" type="email" value={values.email} onChange={set('email')} error={errors.email} disabled={disabled} autoComplete="email" maxLength={256} />
        {options.length > 0 && (
          <SelectField
            label="About"
            value={values.related}
            onChange={set('related')}
            disabled={disabled}
            options={[{ value: '', label: 'General enquiry' }, ...options]}
          />
        )}
        <TextField className={styles.full} label="Subject" required value={values.subject} onChange={set('subject')} error={errors.subject} disabled={disabled} maxLength={150} />
        <TextArea className={styles.full} label="Message" required rows={4} value={values.message} onChange={set('message')} error={errors.message} disabled={disabled} maxLength={3000} />
      </div>
      <p className={styles.formNote}>We share your details only with {businessName} so they can reply. Phone or email is required.</p>
      <Button type="submit" icon={<Send />} loading={busy} disabled={disabled} className={styles.brandButton}>
        Send enquiry
      </Button>
    </form>
  )
}

export function ReviewForm({ slug, disabled, onDone }: { slug: string; disabled?: boolean; onDone?: () => void }) {
  const [name, setName] = useState('')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (disabled) return
    const found: Record<string, string> = {}
    if (!name.trim()) found.customerName = 'Please enter your name.'
    if (rating < 1) found.rating = 'Choose a rating from 1 to 5 stars.'
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    setServerError(null)
    try {
      const result = await publicBusinessApi.review(slug, { customerName: name.trim(), rating, comment: comment.trim() || null })
      setDone(result.message)
      onDone?.()
    } catch (err) {
      setServerError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className={styles.success} role="status">
        <CheckCircle2 aria-hidden />
        <div>
          <strong>Thank you!</strong>
          <p>{done}</p>
        </div>
      </div>
    )
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate aria-label="Write a review">
      {disabled && <Alert tone="info">Reviews can be written once the profile is published.</Alert>}
      {serverError && <Alert tone="error">{serverError}</Alert>}
      <fieldset className={styles.starPicker} disabled={disabled}>
        <legend>Your rating</legend>
        <div role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              className={n <= rating ? styles.starOn : undefined}
              onClick={() => setRating(n)}
            >
              <Star aria-hidden />
            </button>
          ))}
        </div>
        {errors.rating && <p className={styles.fieldError}>{errors.rating}</p>}
      </fieldset>
      <TextField label="Your name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.customerName} disabled={disabled} maxLength={80} />
      <TextArea label="Your review (optional)" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} disabled={disabled} maxLength={1000} />
      <p className={styles.formNote}>Reviews appear after the business approves them.</p>
      <Button type="submit" loading={busy} disabled={disabled} className={styles.brandButton}>
        Submit review
      </Button>
    </form>
  )
}
