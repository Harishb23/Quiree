import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, LogOut } from 'lucide-react'
import { accountApi, authApi } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { Button } from '../../components/ui/Button'
import { Alert, Badge, ErrorState, PageLoader } from '../../components/ui/Feedback'
import { CardHeader, GlassCard, Toggle } from '../../components/ui/Surface'
import { useToast } from '../../components/ui/Toast'
import { PasswordField, validatePassword } from '../auth/PasswordField'
import type { PublicSettings } from '../../types/api'
import styles from './Dashboard.module.scss'
import local from './ModeEditorPage.module.scss'

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const settings = useAsync(() => accountApi.getPublicSettings())
  const [savingSettings, setSavingSettings] = useState(false)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwErrors, setPwErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const [pwMessage, setPwMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [savingPw, setSavingPw] = useState(false)

  if (settings.loading && !settings.data) return <PageLoader />
  if (settings.error || !settings.data || !user) return <ErrorState message={settings.error ?? 'Unknown error'} onRetry={settings.reload} />
  const s = settings.data

  async function updateSettings(patch: Partial<PublicSettings>) {
    const merged = { ...s, ...patch }
    setSavingSettings(true)
    try {
      settings.setData(await accountApi.updatePublicSettings(merged.isPublic, merged.allowViewerModeSelection))
      toast.success('Settings updated.')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSavingSettings(false)
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault()
    const errs: typeof pwErrors = {}
    if (user!.hasPassword && !current) errs.current = 'Enter your current password.'
    const v = validatePassword(next)
    if (v) errs.next = v
    if (confirm !== next) errs.confirm = 'Passwords do not match.'
    setPwErrors(errs)
    if (Object.keys(errs).length) return
    setSavingPw(true)
    setPwMessage(null)
    try {
      await authApi.changePassword(user!.hasPassword ? current : null, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      setPwMessage({ tone: 'success', text: user!.hasPassword ? 'Password changed.' : 'Password set. You can now also sign in with email.' })
      await refreshUser()
    } catch (err) {
      setPwMessage({ tone: 'error', text: getErrorMessage(err) })
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1>Account Settings</h1>
          <p>Manage your account, privacy and security.</p>
        </div>
        <Button
          variant="secondary"
          icon={<LogOut />}
          onClick={async () => {
            await logout()
            navigate('/login', { replace: true })
          }}
        >
          Log out
        </Button>
      </div>

      <div className={styles.grid2}>
        <div className={styles.stack}>
          <GlassCard>
            <CardHeader title="Account" />
            <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 16px', margin: 0, fontSize: 14 }}>
              <dt className={styles.muted}>Login email</dt>
              <dd style={{ margin: 0 }}>{user.email}</dd>
              <dt className={styles.muted}>Public URL</dt>
              <dd style={{ margin: 0 }} className={styles.mono}>
                {s.permanentUrl}
              </dd>
              <dt className={styles.muted}>Sign-in methods</dt>
              <dd style={{ margin: 0, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {user.hasPassword && <Badge>Email & password</Badge>}
                {user.hasGoogle && <Badge>Google</Badge>}
              </dd>
            </dl>
            <p className={styles.muted} style={{ marginTop: 14 }}>
              Your public URL and QR code are permanent and cannot be changed, so printed codes keep working forever.
            </p>
          </GlassCard>

          <GlassCard>
            <CardHeader title="Public profile visibility" />
            <div style={{ display: 'grid', gap: 12 }}>
              <div className={local.publishRow}>
                <div>
                  <strong>Public profile</strong>
                  <span>When off, your link and QR show “profile not found”.</span>
                </div>
                <Toggle checked={s.isPublic} disabled={savingSettings} label="Public profile" onChange={(isPublic) => updateSettings({ isPublic })} />
              </div>
              <div className={local.publishRow}>
                <div>
                  <strong>“Your Choice” mode selection</strong>
                  <span>Let viewers pick one or more of your published modes.</span>
                </div>
                <Toggle
                  checked={s.allowViewerModeSelection}
                  disabled={savingSettings}
                  label="Allow viewer mode selection"
                  onChange={(allowViewerModeSelection) => updateSettings({ allowViewerModeSelection })}
                />
              </div>
            </div>
          </GlassCard>
        </div>

        <GlassCard>
          <CardHeader
            title={user.hasPassword ? 'Change password' : 'Set a password'}
            subtitle={user.hasPassword ? undefined : 'You signed up with Google. Add a password to also sign in with email.'}
          />
          <form onSubmit={changePassword} noValidate style={{ display: 'grid', gap: 14 }}>
            {pwMessage && <Alert tone={pwMessage.tone}>{pwMessage.text}</Alert>}
            {user.hasPassword && (
              <PasswordField label="Current password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={pwErrors.current} />
            )}
            <PasswordField
              label="New password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              error={pwErrors.next}
              hint="At least 8 characters with a letter and a number."
            />
            <PasswordField label="Confirm new password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={pwErrors.confirm} />
            <div>
              <Button type="submit" loading={savingPw} icon={<KeyRound />}>
                {user.hasPassword ? 'Change password' : 'Set password'}
              </Button>
            </div>
          </form>
        </GlassCard>
      </div>
    </>
  )
}
