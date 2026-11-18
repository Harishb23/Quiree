import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Send } from 'lucide-react'
import { getErrorMessage } from '../../api/client'
import { authApi } from '../../api/endpoints'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import { Alert } from '../../components/ui/Feedback'
import { EMAIL_PATTERN } from './PasswordField'
import styles from './Auth.module.scss'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string>()
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!EMAIL_PATTERN.test(email.trim())) {
      setFieldError('Enter a valid email address.')
      return
    }
    setFieldError(undefined)
    setSubmitting(true)
    setError(null)
    try {
      const res = await authApi.forgotPassword(email.trim())
      setSent(res.message)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className={styles.header}>
        <h1>Forgot your password?</h1>
        <p>Enter your account email and we’ll send you a secure reset link.</p>
      </div>
      {sent ? (
        <div className={styles.form}>
          <Alert tone="success">{sent}</Alert>
          <Button to="/login" variant="secondary" fullWidth>
            Back to sign in
          </Button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          {error && <Alert>{error}</Alert>}
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            icon={<Mail />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldError}
            required
          />
          <Button type="submit" size="lg" fullWidth loading={submitting} icon={<Send />}>
            Send reset link
          </Button>
        </form>
      )}
      <p className={styles.footer}>
        Remembered it?{' '}
        <Link to="/login" className={styles.link}>
          Sign in
        </Link>
      </p>
    </>
  )
}
