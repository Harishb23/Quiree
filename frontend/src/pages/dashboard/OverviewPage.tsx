import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Crown, Download, ExternalLink, Layers, Palette, Plus, QrCode, Share2, ShieldCheck, Zap } from 'lucide-react'
import { dashboardApi, modesApi, qrApi } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { useQrImage } from '../../hooks/useQrImage'
import { copyToClipboard, downloadBlob, shareLink } from '../../lib/share'
import { modeTypes } from '../../lib/modeTypes'
import { Button } from '../../components/ui/Button'
import { Badge, EmptyState, ErrorState, PageLoader, Spinner } from '../../components/ui/Feedback'
import { CardHeader, GlassCard, Toggle } from '../../components/ui/Surface'
import { useToast } from '../../components/ui/Toast'
import type { ModeSummary } from '../../types/api'
import styles from './Dashboard.module.scss'

export default function OverviewPage() {
  const { user } = useAuth()
  const toast = useToast()
  const overview = useAsync(() => dashboardApi.overview())
  const modes = useAsync(() => modesApi.list())
  const qr = useQrImage(360)
  const [busyId, setBusyId] = useState<string | null>(null)

  if (overview.loading && !overview.data) return <PageLoader label="Loading your dashboard…" />
  if (overview.error || !overview.data) return <ErrorState message={overview.error ?? 'Unknown error'} onRetry={overview.reload} />

  const o = overview.data
  const firstName = user?.fullName.split(' ')[0] ?? 'there'

  async function togglePublished(mode: ModeSummary, value: boolean) {
    setBusyId(mode.id)
    try {
      const updated = await modesApi.setPublished(mode.id, value)
      modes.setData((prev) => (prev ?? []).map((m) => (m.id === updated.id ? updated : m)))
      void overview.reload()
      toast.success(`${mode.modeName} is now ${value ? 'visible to viewers' : 'hidden'}.`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  async function onShare() {
    const result = await shareLink(o.publicUrl, `${user?.fullName} | Professional profile`)
    if (result === 'copied') toast.success('Profile link copied to clipboard.')
  }

  async function onDownload() {
    try {
      downloadBlob(await qrApi.png(1000), `${user?.publicSlug ?? 'profile'}-qr.png`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1>Welcome back, {firstName}! 👋</h1>
          <p>Manage your professional identities and share them effortlessly.</p>
        </div>
        <div className={styles.headerActions}>
          <Button href={o.publicUrl} target="_blank" variant="secondary" iconRight={<ExternalLink />}>
            View Public Profile
          </Button>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={[styles.stat, styles.statViolet].join(' ')}>
          <Layers />
          <strong>{o.totalModes}</strong>
          <span>Profile Modes · {o.publishedModes} published</span>
        </div>
        <div className={[styles.stat, styles.statGreen].join(' ')}>
          <Zap />
          <strong>{o.activeModeName ?? '—'}</strong>
          <span>Active (default) Mode</span>
        </div>
        <div className={[styles.stat, styles.statPink].join(' ')}>
          <Palette />
          <strong>{o.selectedTemplateName ?? '—'}</strong>
          <span>Selected Template</span>
        </div>
        <div className={[styles.stat, styles.statCyan].join(' ')}>
          <QrCode />
          <strong>{o.qrStatus}</strong>
          <span>QR Code Status</span>
        </div>
        <div className={[styles.stat, styles.statAmber].join(' ')}>
          <Crown />
          <strong>{o.subscription.planName}</strong>
          <span>{o.subscription.isPaid ? 'Active subscription' : 'Current plan'}</span>
        </div>
      </div>

      <div className={styles.grid2}>
        <GlassCard>
          <CardHeader
            title="Your Permanent QR Code"
            subtitle="It never changes — update modes, templates or details any time."
            action={
              <Badge tone="green">
                <ShieldCheck /> Permanent
              </Badge>
            }
          />
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className={styles.qrBox}>
              {qr.src ? (
                <img src={qr.src} alt="Your permanent profile QR code" width={150} height={150} />
              ) : qr.error ? (
                <span style={{ color: '#1b1340', fontSize: 13 }}>QR unavailable</span>
              ) : (
                <Spinner />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 200, display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={styles.mono} style={{ flex: 1 }}>
                  {o.publicUrl}
                </span>
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label="Copy profile link"
                  onClick={async () => (await copyToClipboard(o.publicUrl)) && toast.success('Link copied.')}
                >
                  <Copy />
                </button>
              </div>
              {!o.isPublic && <Badge tone="amber">Profile is private — viewers see “not found”</Badge>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button size="sm" icon={<Download />} onClick={onDownload}>
                  Download QR
                </Button>
                <Button size="sm" variant="secondary" icon={<Share2 />} onClick={onShare}>
                  Share
                </Button>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <CardHeader
            title="Profile Modes"
            subtitle={`${o.totalModes} of ${o.subscription.maxModes} used on ${o.subscription.planName}`}
            action={
              <Button to="/dashboard/modes/new" size="sm" icon={<Plus />}>
                Add Mode
              </Button>
            }
          />
          {modes.loading && !modes.data ? (
            <Spinner />
          ) : modes.error ? (
            <ErrorState message={modes.error} onRetry={modes.reload} />
          ) : !modes.data?.length ? (
            <EmptyState
              icon={<Layers />}
              title="No profile modes yet"
              description="Create your first professional identity — e.g. Software Developer or HR Manager."
              action={
                <Button to="/dashboard/modes/new" size="sm" icon={<Plus />}>
                  Create first mode
                </Button>
              }
            />
          ) : (
            <div>
              {modes.data.slice(0, 5).map((m) => {
                const Icon = modeTypes[m.modeType]?.icon ?? Layers
                return (
                  <div key={m.id} className={styles.listRow}>
                    <span className={styles.modeIcon}>
                      <Icon />
                    </span>
                    <div className={styles.listRowMain}>
                      <strong>
                        <Link to={`/dashboard/modes/${m.id}`}>{m.modeName}</Link>
                        {m.isDefault && <Badge tone="violet">Default</Badge>}
                      </strong>
                      <span>{m.designation || m.templateName || 'No designation yet'}</span>
                    </div>
                    <Toggle
                      checked={m.isPublished}
                      disabled={busyId === m.id}
                      label={`Publish ${m.modeName}`}
                      onChange={(v) => togglePublished(m, v)}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard style={{ marginTop: 20 }}>
        <CardHeader
          title="Profile completion"
          subtitle="Complete profiles get saved and shared more often."
          action={<strong>{o.profileCompletion}%</strong>}
        />
        <div className={styles.progressTrack}>
          <div className={styles.progressBar} style={{ width: `${o.profileCompletion}%` }} />
        </div>
        {o.profileCompletion < 100 && (
          <p className={styles.muted} style={{ marginTop: 12 }}>
            Add your photo, contact details, summary and social links in <Link to="/dashboard/profile">My Profile</Link>.
          </p>
        )}
      </GlassCard>
    </>
  )
}
