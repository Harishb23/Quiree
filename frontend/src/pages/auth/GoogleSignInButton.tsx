import { useEffect, useRef, useState } from 'react'
import { config } from '../../config'
import { loadScript } from '../../lib/loadScript'
import styles from './Auth.module.scss'

interface GoogleAccounts {
  accounts: {
    id: {
      initialize: (options: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void
      renderButton: (el: HTMLElement, options: Record<string, unknown>) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleAccounts
  }
}

/** Google Identity Services button. The returned ID token is verified by the backend. */
export function GoogleSignInButton({
  onCredential,
  text = 'continue_with',
}: {
  onCredential: (idToken: string) => void
  text?: 'signin_with' | 'signup_with' | 'continue_with'
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onCredential)
  callbackRef.current = onCredential
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!config.googleClientId) return
    let cancelled = false
    loadScript('https://accounts.google.com/gsi/client')
      .then(() => {
        if (cancelled || !window.google || !containerRef.current) return
        window.google.accounts.id.initialize({
          client_id: config.googleClientId,
          callback: (response) => callbackRef.current(response.credential),
        })
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text,
          width: Math.min(containerRef.current.clientWidth || 360, 400),
        })
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [text])

  if (!config.googleClientId) return null
  if (failed) return <p style={{ fontSize: 13, opacity: 0.7, textAlign: 'center' }}>Google sign-in is unavailable right now.</p>
  return <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />
}

export function GoogleDivider() {
  return config.googleClientId ? <div className={styles.divider}>or</div> : null
}
