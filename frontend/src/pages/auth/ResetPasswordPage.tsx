import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { getErrorMessage } from '../../api/client'
import { authApi } from '../../api/endpoints'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Feedback'
import { PasswordField, validatePassword } from './PasswordField'
import styles from './Auth.module.scss'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!email || !token) {
    return (
      <div className={styles.form}>
        <div className={styles.header}>
          <h1>Invalid reset link</h1>
          <p>This link is incomplete. Request a new one to reset your password.</p>
        </div>
        <Button to="/forgot-password" fullWidth>
          Request a new link
        </Button>
      </div>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    const pw = validatePassword(password)
    if (pw) next.password = pw
    if (confirm !== password) next.confirm = 'Passwords do not match.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSubmitting(true)
    setError(null)
    try {
      const res = await authApi.resetPassword(email, token, password)
      setDone(res.message)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className={styles.header}>
        <h1>Choose a new password</h1>
        <p>
          Resetting the password for <strong>{email}</strong>
        </p>
      </div>
      {done ? (
        <div className={styles.form}>
          <Alert tone="success">{done}</Alert>
          <Button to="/login" fullWidth>
            Sign in
          </Button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          {error && (
            <Alert>
              {error}{' '}
              <Link to="/forgot-password" className={styles.link}>
                Request a new link
              </Link>
            </Alert>
          )}
          <PasswordField
            label="New password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            hint="At least 8 characters with a letter and a number."
            required
          />
          <PasswordField
            label="Confirm new password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm}
            required
          />
          <Button type="submit" size="lg" fullWidth loading={submitting} icon={<KeyRound />}>
            Reset password
          </Button>
        </form>
      )}
    </>
  )
}
