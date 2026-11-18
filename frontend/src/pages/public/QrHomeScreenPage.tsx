import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { Download, ExternalLink, Smartphone, UserX } from 'lucide-react'
import { publicApi } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { config } from '../../config'
import { useInstallPrompt, usePublicProfilePwa } from '../../lib/pwa'
import { Button } from '../../components/ui/Button'
import { BrandedQr, BrandedQrTile } from '../../components/qr/BrandedQr'
import { useToast } from '../../components/ui/Toast'
import { svgToPng } from '../../lib/qrCard'
import { downloadBlob } from '../../lib/share'
import { InstallHelpModal } from '../../components/pwa/InstallHelpModal'
import { ErrorState, PageLoader } from '../../components/ui/Feedback'
import type { PublicProfile } from '../../types/api'
import styles from './QrHomeScreenPage.module.scss'

type LoadState =
  | { status: 'loading' }
  | { status: 'notFound' }
  | { status: 'error'; message: string }
  | { status: 'ready'; profile: PublicProfile }

/**
 * "My QR" home-screen app: a full-screen QR the owner shows to people so they can scan it.
 * Installed separately from the profile (its own manifest, start_url /q/{slug}).
 */
export default function QrHomeScreenPage() {
  const { slug = '' } = useParams()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    publicApi
      .get(slug)
      .then((profile) => active && setState({ status: 'ready', profile }))
      .catch((e: unknown) => {
        if (!active) return
        if (axios.isAxiosError(e) && e.response?.status === 404) setState({ status: 'notFound' })
        else setState({ status: 'error', message: getErrorMessage(e) })
      })
    return () => {
      active = false
    }
  }, [slug, attempt])

  if (state.status === 'loading') return <PageLoader label="Loading QR…" />
  if (state.status === 'error')
    return (
      <div className={`${styles.page} app-dark-bg`}>
        <ErrorState message={state.message} onRetry={() => setAttempt((n) => n + 1)} />
      </div>
    )
  if (state.status === 'notFound')
    return (
      <div className={`${styles.page} app-dark-bg`}>
        <div className={styles.missing}>
          <UserX />
          <h1>QR not available</h1>
          <p>This profile doesn’t exist or is private.</p>
        </div>
      </div>
    )

  return <QrScreen slug={slug} profile={state.profile} />
}

function QrScreen({ slug, profile }: { slug: string; profile: PublicProfile }) {
  const { support, promptInstall } = useInstallPrompt()
  const [showHelp, setShowHelp] = useState(false)
  const mode = profile.modes.find((m) => m.id === profile.defaultModeId) ?? profile.modes[0]

  const tileRef = useRef<SVGSVGElement>(null)
  const toast = useToast()

  // Installs as the brand app (e.g. "Quiree"), opening straight on this QR.
  usePublicProfilePwa(publicApi.qrManifestUrl(slug), config.appName)
  useScreenAwake()

  useEffect(() => {
    const previous = document.title
    document.title = `${profile.fullName} QR | ${config.appName}`
    return () => {
      document.title = previous
    }
  }, [profile.fullName])

  async function onInstall() {
    if (support === 'prompt') {
      await promptInstall()
      return
    }
    setShowHelp(true)
  }

  async function saveWidgetImage() {
    if (!tileRef.current) return
    try {
      downloadBlob(await svgToPng(tileRef.current), `${slug}-qr-widget.png`)
      toast.success('Saved. Add it with your home screen’s Photo widget.')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div className={`${styles.page} app-dark-bg`}>
      <main className={styles.card}>
        <BrandedQr url={profile.permanentUrl} brand={config.appName} className={styles.qr} />
        <h1>{profile.fullName}</h1>
        {mode?.designation && <p className={styles.role}>{mode.designation}</p>}
      </main>

      {support !== 'installed' && (
        <div className={styles.actions}>
          <Button icon={<Smartphone />} onClick={onInstall}>
            Add QR to Home Screen
          </Button>
          <Button variant="secondary" icon={<Download />} onClick={saveWidgetImage}>
            Save QR widget image
          </Button>
          <Button href={profile.permanentUrl} variant="ghost" iconRight={<ExternalLink />}>
            Open profile
          </Button>
          <InstallHelpModal open={showHelp} onClose={() => setShowHelp(false)} link={window.location.href} />
        </div>
      )}
      <div hidden>
        <BrandedQrTile ref={tileRef} url={profile.permanentUrl} brand={config.appName} />
      </div>
    </div>
  )
}

/** Keeps the screen on while the QR is shown, where the browser supports it. */
function useScreenAwake() {
  useEffect(() => {
    type WakeLock = { release: () => Promise<void> }
    const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLock> } }
    if (!nav.wakeLock) return
    let lock: WakeLock | null = null
    const acquire = () => {
      if (document.visibilityState === 'visible')
        nav.wakeLock
          ?.request('screen')
          .then((l) => (lock = l))
          .catch(() => {
            /* not allowed (battery saver etc.) - the QR still shows */
          })
    }
    acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      document.removeEventListener('visibilitychange', acquire)
      void lock?.release().catch(() => {})
    }
  }, [])
}
