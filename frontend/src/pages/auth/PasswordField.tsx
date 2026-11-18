import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { TextField } from '../../components/ui/Field'
import styles from './Auth.module.scss'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> & {
  label: string
  error?: string
  hint?: string
}

export function PasswordField(props: Props) {
  const [visible, setVisible] = useState(false)
  return (
    <div className={styles.passwordWrap}>
      <TextField {...props} type={visible ? 'text' : 'password'} icon={<Lock />} />
      <button
        type="button"
        className={styles.passwordToggle}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff /> : <Eye />}
      </button>
    </div>
  )
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Mirrors the backend rule: 8+ chars with at least one letter and one number. */
export function validatePassword(password: string): string | undefined {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password must contain at least one letter and one number.'
  return undefined
}
