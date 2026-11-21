import { useRef } from 'react'
import { CheckCircle2, Copy, Download, ExternalLink, FileCode2, Printer, Share2, ShieldCheck, Smartphone } from 'lucide-react'
import { qrApi } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { useAsync } from '../../hooks/useAsync'
import { formatDate } from '../../lib/format'
import { copyToClipboard, downloadBlob, shareLink } from '../../lib/share'
import { svgToPng } from '../../lib/qrCard'
import { config } from '../../config'
import { BrandedQr, BrandedQrTile } from '../../components/qr/BrandedQr'
import { HomeWidgetCard } from '../../components/qr/HomeWidgetCard'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/Button'
import { Alert, Badge, ErrorState, PageLoader } from '../../components/ui/Feedback'
import { CardHeader, GlassCard } from '../../components/ui/Surface'
import { useToast } from '../../components/ui/Toast'
import styles from './Dashboard.module.scss'
import local from './QrCodePage.module.scss'

const NEVER_CHANGES = [
  'You switch or add professional modes',
  'You update your profile, skills or experience',
  'You change templates',
  'You change your default mode',
]

export default function QrCodePage() {
  const toast = useToast()
  const { user } = useAuth()
  const info = useAsync(() => qrApi.info())
  const brandedRef = useRef<SVGSVGElement>(null)
  const tileRef = useRef<SVGSVGElement>(null)

  if (info.loading && !info.data) return <PageLoader label="Loading your QR code…" />
  if (info.error || !info.data) return <ErrorState message={info.error ?? 'Unknown error'} onRetry={info.reload} />
  const q = info.data

  async function download(kind: 'png' | 'svg') {
    try {
      const blob = kind === 'png' ? await qrApi.png(1200) : await qrApi.svg()
      downloadBlob(blob, `${q.publicSlug}-qr.${kind}`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  async function downloadBranded(svg: SVGSVGElement | null, kind: 'card' | 'widget') {
    if (!svg) return
    try {
      downloadBlob(await svgToPng(svg), `${q.publicSlug}-qr-${kind}.png`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  // Full-screen QR page the owner installs on their own home screen.
  const homeScreenUrl = `${new URL(q.permanentUrl).origin}/q/${q.publicSlug}`

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1>Your Permanent QR Code</h1>
          <p>Print it, share it, put it on your business card — it will always open your profile.</p>
        </div>
      </div>

      {!q.isPublic && (
        <div style={{ marginBottom: 20 }}>
          <Alert tone="info">Your profile is currently private. The QR code still works, but viewers will see “profile not found” until you make it public in Account Settings.</Alert>
        </div>
      )}

      <div className={styles.grid2}>
        <GlassCard className={local.qrCard}>
          <BrandedQr ref={brandedRef} url={q.permanentUrl} brand={config.appName} className={local.branded} />
          <Badge tone="green">
            <ShieldCheck /> Permanent · never changes
          </Badge>
          <div className={local.url}>
            <span className={styles.mono}>{q.permanentUrl}</span>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Copy link"
              onClick={async () => (await copyToClipboard(q.permanentUrl)) && toast.success('Link copied.')}
            >
              <Copy />
            </button>
          </div>
          <div className={local.buttons}>
            <Button icon={<Download />} onClick={() => downloadBranded(brandedRef.current, 'card')}>
              Download QR card
            </Button>
            <Button variant="secondary" icon={<Download />} onClick={() => download('png')}>
              Plain PNG
            </Button>
            <Button variant="secondary" icon={<FileCode2 />} onClick={() => download('svg')}>
              Download SVG
            </Button>
            <Button
              variant="secondary"
              icon={<Share2 />}
              onClick={async () => (await shareLink(q.permanentUrl, 'My professional profile')) === 'copied' && toast.success('Link copied.')}
            >
              Share
            </Button>
            <Button variant="ghost" icon={<Printer />} onClick={() => window.print()}>
              Print
            </Button>
          </div>
        </GlassCard>

        <div className={styles.stack}>
          <HomeWidgetCard qr={{ url: q.permanentUrl, title: user?.fullName ?? q.publicSlug, openPath: `/q/${q.publicSlug}` }} />
          <GlassCard>
            <CardHeader title="Put your QR on your phone’s home screen" />
            <ol className={local.steps}>
              <li>
                <strong>App icon:</strong> open your <strong>My QR</strong> link on your phone and tap{' '}
                <strong>Add QR to Home Screen</strong>. The {config.appName} icon then opens your QR full screen, even offline.
              </li>
              <li>
                <strong>QR tile on the home screen:</strong> download the widget image, then long-press the home screen →{' '}
                <strong>Widgets</strong> → <strong>Photo</strong> (Gallery / Photo frame) and pick the image.
              </li>
            </ol>
            <BrandedQrTile ref={tileRef} url={q.permanentUrl} brand={config.appName} className={local.tile} />
            <Button size="sm" icon={<Download />} onClick={() => downloadBranded(tileRef.current, 'widget')}>
              Download QR widget image
            </Button>
            <div className={local.url}>
              <span className={styles.mono}>{homeScreenUrl}</span>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Copy My QR link"
                onClick={async () => (await copyToClipboard(homeScreenUrl)) && toast.success('My QR link copied.')}
              >
                <Copy />
              </button>
            </div>
            <div className={local.buttons}>
              <Button href={homeScreenUrl} target="_blank" size="sm" icon={<Smartphone />}>
                Open My QR
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Share2 />}
                onClick={async () => (await shareLink(homeScreenUrl, 'My QR')) === 'copied' && toast.success('My QR link copied.')}
              >
                Send to my phone
              </Button>
            </div>
          </GlassCard>
          <GlassCard>
            <CardHeader title="Your QR never changes when…" />
            <ul className={local.checks}>
              {NEVER_CHANGES.map((c) => (
                <li key={c}>
                  <CheckCircle2 /> {c}
                </li>
              ))}
            </ul>
          </GlassCard>
          <GlassCard>
            <CardHeader title="How viewers experience it" />
            <ol className={local.steps}>
              <li>They scan the code — no app or login needed.</li>
              <li>Your public profile opens on your default mode (or the mode they picked last time on that device).</li>
              <li>They can switch modes, save your contact, share, or add your profile to their home screen.</li>
            </ol>
          </GlassCard>
          <GlassCard>
            <CardHeader title="QR details" />
            <dl className={local.details}>
              <dt>Public username</dt>
              <dd className={styles.mono}>{q.publicSlug}</dd>
              <dt>QR reference</dt>
              <dd className={styles.mono}>{q.qrReference}</dd>
              <dt>Created</dt>
              <dd>{formatDate(q.generatedAt)}</dd>
            </dl>
            <Button href={q.permanentUrl} target="_blank" variant="secondary" size="sm" iconRight={<ExternalLink />}>
              Open public profile
            </Button>
          </GlassCard>
        </div>
      </div>
    </>
  )
}
