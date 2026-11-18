import { useState, type FormEvent } from 'react'
import { CheckCircle2, Clock, Mail, MapPin, Phone, Send } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { TextArea, TextField } from '../../components/ui/Field'
import { Alert } from '../../components/ui/Feedback'
import { enquiryApi } from '../../api/endpoints'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { company } from '../../content/siteContent'
import type { EnquiryRequest } from '../../types/api'
import styles from './Marketing.module.scss'

type FormState = Required<EnquiryRequest>
type Errors = Partial<Record<keyof FormState, string>>

const empty: FormState = { name: '', email: '', phone: '', subject: '', message: '' }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+\d][\d\s()-]{5,29}$/

/** Mirrors the backend CreateEnquiryRequest validation rules. */
export function validateEnquiry(v: FormState): Errors {
  const errors: Errors = {}
  const name = v.name.trim()
  if (name.length < 2 || name.length > 100) errors.name = 'Please enter your name (2–100 characters).'
  if (!EMAIL_RE.test(v.email.trim())) errors.email = 'Please enter a valid email address.'
  if (v.phone.trim() && !PHONE_RE.test(v.phone.trim())) errors.phone = 'Please enter a valid phone number.'
  const subject = v.subject.trim()
  if (subject.length < 3 || subject.length > 150) errors.subject = 'Subject must be 3–150 characters.'
  const message = v.message.trim()
  if (message.length < 10 || message.length > 3000) errors.message = 'Message must be 10–3000 characters.'
  return errors
}

export default function ContactPage() {
  const [values, setValues] = useState<FormState>(empty)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const set = (field: keyof FormState) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [field]: e.target.value }))
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setServerError(null)
    const found = validateEnquiry(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      const res = await enquiryApi.create({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
        subject: values.subject.trim(),
        message: values.message.trim(),
      })
      setSuccessMessage(res.message || 'Thank you! We will get back to you shortly.')
      setValues(empty)
    } catch (err) {
      setErrors(getFieldErrors(err) as Errors)
      setServerError(getErrorMessage(err, 'We could not send your message. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <header className={styles.pageHero}>
        <span className={styles.eyebrow}>Contact Us</span>
        <h1>
          Let’s <span className={styles.gradientText}>talk</span>
        </h1>
        <p>Questions about plans, partnerships or bulk onboarding for your team? Send us an enquiry.</p>
      </header>

      <section className={styles.section}>
        <div className={styles.contactGrid}>
          <div className={styles.contactInfo}>
            <div className={styles.contactItem}>
              <span className={styles.featureIcon}>
                <Mail />
              </span>
              <div>
                <h3>Email</h3>
                <a href={`mailto:${company.email}`}>{company.email}</a>
              </div>
            </div>
            <div className={styles.contactItem}>
              <span className={styles.featureIcon}>
                <Phone />
              </span>
              <div>
                <h3>Phone</h3>
                <a href={`tel:${company.phone.replace(/[^\d+]/g, '')}`}>{company.phone}</a>
              </div>
            </div>
            <div className={styles.contactItem}>
              <span className={styles.featureIcon}>
                <MapPin />
              </span>
              <div>
                <h3>Office</h3>
                <p>{company.address}</p>
              </div>
            </div>
            <div className={styles.contactItem}>
              <span className={styles.featureIcon}>
                <Clock />
              </span>
              <div>
                <h3>Hours</h3>
                <p>{company.hours}</p>
              </div>
            </div>
          </div>

          {successMessage ? (
            <div className={styles.form}>
              <div className={styles.success} role="status">
                <CheckCircle2 aria-hidden />
                <h3>Message sent</h3>
                <p>{successMessage}</p>
                <Button variant="secondary" onClick={() => setSuccessMessage(null)}>
                  Send another message
                </Button>
              </div>
            </div>
          ) : (
            <form className={styles.form} onSubmit={onSubmit} noValidate aria-label="Enquiry form">
              {serverError && <Alert>{serverError}</Alert>}
              <div className={styles.formRow}>
                <TextField
                  label="Full name"
                  name="name"
                  required
                  value={values.name}
                  onChange={set('name')}
                  error={errors.name}
                  maxLength={100}
                  autoComplete="name"
                />
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  required
                  value={values.email}
                  onChange={set('email')}
                  error={errors.email}
                  maxLength={256}
                  autoComplete="email"
                />
              </div>
              <div className={styles.formRow}>
                <TextField
                  label="Phone (optional)"
                  name="phone"
                  type="tel"
                  value={values.phone}
                  onChange={set('phone')}
                  error={errors.phone}
                  maxLength={30}
                  autoComplete="tel"
                />
                <TextField
                  label="Subject"
                  name="subject"
                  required
                  value={values.subject}
                  onChange={set('subject')}
                  error={errors.subject}
                  maxLength={150}
                />
              </div>
              <TextArea
                label="Message"
                name="message"
                required
                rows={6}
                value={values.message}
                onChange={set('message')}
                error={errors.message}
                maxLength={3000}
                hint={`${values.message.trim().length}/3000`}
              />
              <Button type="submit" size="lg" loading={submitting} icon={<Send />}>
                Send enquiry
              </Button>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
