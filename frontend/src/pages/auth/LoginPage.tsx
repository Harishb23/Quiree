import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, LogIn } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { redirectAfterLogin } from '../../lib/accounts'
import { getErrorMessage } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import { Alert } from '../../components/ui/Feedback'
import { GoogleDivider, GoogleSignInButton } from './GoogleSignInButton'
import { EMAIL_PATTERN, PasswordField } from './PasswordField'
import styles from './Auth.module.scss'

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Enter your password.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSubmitting(true)
    setError(null)
    try {
      const user = await login(email.trim(), password)
      // Only navigate once the API has accepted the credentials; each account type has its own dashboard.
      navigate(redirectAfterLogin(user, from), { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign in.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function onGoogle(idToken: string) {
    setError(null)
    try {
      const user = await loginWithGoogle(idToken)
      navigate(redirectAfterLogin(user, from), { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Google sign-in failed.'))
    }
  }

  return (
    <>
      <div className={styles.header}>
        <h1>Welcome back</h1>
        <p>Sign in to manage your professional identities.</p>
      </div>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {error && <Alert>{error}</Alert>}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          icon={<Mail />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />
        <div className={styles.row}>
          <span />
          <Link to="/forgot-password" className={styles.link}>
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" fullWidth loading={submitting} icon={<LogIn />}>
          Sign in
        </Button>
        <GoogleDivider />
        <GoogleSignInButton onCredential={onGoogle} text="signin_with" />
      </form>
      <p className={styles.footer}>
        New here?{' '}
        <Link to="/register" className={styles.link}>
          Create your free account
        </Link>
      </p>
    </>
  )
}

