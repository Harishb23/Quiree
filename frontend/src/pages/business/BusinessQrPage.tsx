import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Download, ExternalLink, FileCode2, Printer, QrCode, RefreshCw, ScanLine, Share2 } from 'lucide-react'
import { businessApi } from '../../api/businessApi'
import { getErrorMessage } from '../../api/client'
import { useAsync } from '../../hooks/useAsync'
import { formatDate } from '../../lib/format'
import { svgToPng } from '../../lib/qrCard'
import { copyToClipboard, downloadBlob, shareLink } from '../../lib/share'
import { BrandedQr } from '../../components/qr/BrandedQr'
import { Button } from '../../components/ui/Button'
import { Alert, Badge, ErrorState, PageLoader } from '../../components/ui/Feedback'
import { CardHeader, GlassCard, Toggle } from '../../components/ui/Surface'
import { ConfirmDialog } from '../../components/ui/Widgets'
import { useToast } from '../../components/ui/Toast'
import { useBusiness } from './BusinessShell'
import dash from '../dashboard/Dashboard.module.scss'
import styles from './BusinessQrPage.module.scss'

/** Owner QR management: preview, downloads, sharing, scan stats, enable/disable and regenerate. */
export default function BusinessQrPage() {
  const { business, can } = useBusiness()
  const toast = useToast()
  const qr = useAsync(() => businessApi.qr(business.id), [business.id])
  const brandedRef = useRef<SVGSVGElement>(null)
  const [confirm, setConfirm] = useState<'disable' | 'regenerate' | null>(null)
  const [busy, setBusy] = useState(false)
  const canManage = can('Manager')

  if (qr.loading && !qr.data) return <PageLoader label="Loading QR code…" />
  if (qr.error || !qr.data) return <ErrorState message={qr.error ?? 'Unknown error'} onRetry={qr.reload} />
  const q = qr.data
  const file = business.slug

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const setEnabled = (enabled: boolean) =>
    run(async () => {
      qr.setData(await businessApi.setQrEnabled(business.id, enabled))
      setConfirm(null)
      toast.success(enabled ? 'QR code turned on.' : 'QR code turned off. Scans now show a “turned off” message.')
    })

  const regenerate = () =>
    run(async () => {
      qr.setData(await businessApi.regenerateQr(business.id))
      setConfirm(null)
      toast.success('New QR code created. Download and reprint it — the old code no longer works.')
    })

  const download = (kind: 'png' | 'svg') =>
    run(async () => {
      const blob = kind === 'png' ? await businessApi.qrPng(business.id, 1200) : await businessApi.qrSvg(business.id)
      downloadBlob(blob, `${file}-qr.${kind}`)
    })

  const downloadCard = () =>
    run(async () => {
      if (!brandedRef.current) return
      downloadBlob(await svgToPng(brandedRef.current), `${file}-qr-card.png`)
    })

  const copy = async (text: string, what: string) => (await copyToClipboard(text)) && toast.success(`${what} copied.`)

  return (
    <>
      <div className={dash.pageHeader}>
        <div>
          <h1>Business QR Code</h1>
          <p>Customers scan this code to open {business.name}’s storefront — no app or login needed.</p>
        </div>
        <div className={dash.headerActions}>
          <Button to={`/dashboard/business/${business.id}/qr/campaigns`} variant="outline" icon={<ScanLine />}>
            QR campaigns
          </Button>
        </div>
      </div>

      <div className={dash.stack}>
        {!q.isPublished && (
          <Alert tone="info">
            Your business profile is unpublished, so scans show “profile not available” until you publish it in{' '}
            <Link to={`/dashboard/business/${business.id}/settings`} style={{ textDecoration: 'underline' }}>
              Business Settings
            </Link>
            .
          </Alert>
        )}
        {!q.enabled && <Alert tone="error">This QR code is turned off. Customers who scan it see a “turned off” message.</Alert>}

        <div className={dash.grid2}>
          <GlassCard className={styles.qrCard}>
            <div className={[styles.qrWrap, !q.enabled && styles.qrOff].filter(Boolean).join(' ')}>
              <BrandedQr ref={brandedRef} url={q.qrUrl} brand={business.name} className={styles.branded} />
            </div>
            <Badge tone={q.enabled ? 'green' : 'gray'}>{q.enabled ? 'Active' : 'Turned off'}</Badge>
            <div className={styles.link}>
              <span className={dash.mono}>{q.qrUrl}</span>
              <button type="button" className={dash.iconBtn} aria-label="Copy QR link" onClick={() => copy(q.qrUrl, 'QR link')}>
                <Copy />
              </button>
            </div>
            <div className={styles.buttons}>
              <Button icon={<Download />} onClick={downloadCard} disabled={busy}>
                Download QR card
              </Button>
              <Button variant="secondary" icon={<Download />} onClick={() => download('png')} disabled={busy}>
                Plain PNG
              </Button>
              <Button variant="secondary" icon={<FileCode2 />} onClick={() => download('svg')} disabled={busy}>
                SVG
              </Button>
              <Button
                variant="secondary"
                icon={<Share2 />}
                onClick={async () => (await shareLink(q.publicUrl, business.name)) === 'copied' && toast.success('Link copied.')}
              >
                Share
              </Button>
              <Button variant="ghost" icon={<Printer />} onClick={() => window.print()}>
                Print
              </Button>
            </div>
          </GlassCard>

          <div className={dash.stack}>
            <div className={dash.stats} style={{ marginBottom: 0 }}>
              <div className={dash.stat}>
                <span className={dash.statIcon}>
                  <ScanLine />
                </span>
                <strong>{q.totalScans.toLocaleString('en-IN')}</strong>
                <span>Total scans</span>
              </div>
              <div className={[dash.stat, dash.statGold].join(' ')}>
                <span className={dash.statIcon}>
                  <QrCode />
                </span>
                <strong>{q.scansLast30Days.toLocaleString('en-IN')}</strong>
                <span>Scans · last 30 days</span>
              </div>
            </div>

            <GlassCard>
              <CardHeader title="Storefront link" subtitle="The page your QR code opens." />
              <div className={styles.link}>
                <span className={dash.mono}>{q.publicUrl}</span>
                <button type="button" className={dash.iconBtn} aria-label="Copy storefront link" onClick={() => copy(q.publicUrl, 'Storefront link')}>
                  <Copy />
                </button>
              </div>
              <div style={{ marginTop: 12 }}>
                <Button href={q.publicUrl} target="_blank" variant="outline" size="sm" iconRight={<ExternalLink />}>
                  Open storefront
                </Button>
              </div>
            </GlassCard>

            <GlassCard>
              <CardHeader title="QR settings" subtitle={canManage ? undefined : 'Only owners and managers can change these.'} />
              <div className={styles.settingRow}>
                <div>
                  <strong>QR code active</strong>
                  <span>Turn off to stop scans opening your storefront (e.g. while printing new codes).</span>
                </div>
                <Toggle
                  checked={q.enabled}
                  disabled={!canManage || busy}
                  label="QR code active"
                  onChange={(v) => (v ? void setEnabled(true) : setConfirm('disable'))}
                />
              </div>
              <div className={styles.settingRow}>
                <div>
                  <strong>Regenerate QR code</strong>
                  <span>Created {formatDate(q.generatedAt)}. A new code replaces this one; printed copies stop working.</span>
                </div>
                <Button variant="outline" size="sm" icon={<RefreshCw />} disabled={!canManage || busy} onClick={() => setConfirm('regenerate')}>
                  Regenerate
                </Button>
              </div>
              <p className={dash.muted} style={{ marginTop: 12 }}>
                Your QR keeps working if you change your storefront link — it points to a permanent code, not the link itself.
              </p>
            </GlassCard>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'disable'}
        title="Turn off this QR code?"
        confirmLabel="Turn off"
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() => void setEnabled(false)}
      >
        <p>Customers scanning your printed code will see a “turned off” message until you turn it back on.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'regenerate'}
        title="Regenerate QR code?"
        confirmLabel="Regenerate"
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() => void regenerate()}
      >
        <p>
          <strong>Every printed copy of your current QR code will stop working.</strong> Only do this if the code was misused or you
          are reprinting all your materials.
        </p>
      </ConfirmDialog>
    </>
  )
}
