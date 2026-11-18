import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AtSign, Mail, User, UserPlus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { authApi } from '../../api/endpoints'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import { Alert } from '../../components/ui/Feedback'
import { GoogleDivider, GoogleSignInButton } from './GoogleSignInButton'
import { EMAIL_PATTERN, PasswordField, validatePassword } from './PasswordField'
import styles from './Auth.module.scss'

type Errors = Partial<Record<'fullName' | 'email' | 'password' | 'confirm' | 'username', string>>

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ fullName: '', email: '', username: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [availability, setAvailability] = useState<{ ok: boolean; message: string } | null>(null)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: key === 'username' ? e.target.value.toLowerCase() : e.target.value }))

  // Debounced username availability check.
  useEffect(() => {
    const username = form.username.trim()
    if (!username) {
      setAvailability(null)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await authApi.usernameAvailable(username)
        setAvailability({ ok: res.available, message: res.available ? 'Available' : (res.reason ?? 'Unavailable') })
      } catch {
        setAvailability(null)
      }
    }, 450)
    return () => clearTimeout(timer)
  }, [form.username])

  function validate(): Errors {
    const next: Errors = {}
    if (form.fullName.trim().length < 2) next.fullName = 'Enter your full name.'
    if (!EMAIL_PATTERN.test(form.email.trim())) next.email = 'Enter a valid email address.'
    const u = form.username.trim()
    if (u && (u.length < 3 || u.length > 30 || !USERNAME_PATTERN.test(u) || u.includes('--')))
      next.username = 'Use 3-30 lowercase letters, numbers or single hyphens.'
    const pw = validatePassword(form.password)
    if (pw) next.password = pw
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match.'
    return next
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length) return

    setSubmitting(true)
    setError(null)
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        username: form.username.trim() || undefined,
      })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setErrors(getFieldErrors(err) as Errors)
      setError(getErrorMessage(err, 'Unable to create your account.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function onGoogle(idToken: string) {
    setError(null)
    try {
      await loginWithGoogle(idToken)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Google sign-up failed.'))
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <>
      <div className={styles.header}>
        <h1>Create your account</h1>
        <p>One account, every professional identity, one permanent QR code.</p>
      </div>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {error && <Alert>{error}</Alert>}
        <TextField
          label="Full name"
          autoComplete="name"
          icon={<User />}
          value={form.fullName}
          onChange={set('fullName')}
          error={errors.fullName}
          required
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          icon={<Mail />}
          value={form.email}
          onChange={set('email')}
          error={errors.email}
          required
        />
        <TextField
          label="Username (optional)"
          icon={<AtSign />}
          value={form.username}
          onChange={set('username')}
          error={errors.username}
          maxLength={30}
          autoComplete="off"
          hint={
            <span>
              Your permanent profile link — it can’t be changed later.{' '}
              <span className={styles.slugPreview}>
                {origin}/p/{form.username || 'auto-generated'}
              </span>{' '}
              {availability && (
                <strong className={availability.ok ? styles.available : styles.unavailable}>
                  {availability.message}
                </strong>
              )}
            </span>
          }
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          hint="At least 8 characters with a letter and a number."
          required
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={set('confirm')}
          error={errors.confirm}
          required
        />
        <Button type="submit" size="lg" fullWidth loading={submitting} icon={<UserPlus />}>
          Create account
        </Button>
        <GoogleDivider />
        <GoogleSignInButton onCredential={onGoogle} text="signup_with" />
      </form>
      <p className={styles.footer}>
        Already have an account?{' '}
        <Link to="/login" className={styles.link}>
          Sign in
        </Link>
      </p>
    </>
  )
}
