import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink, Inbox, Pencil, QrCode, ShieldOff, Tag } from 'lucide-react'
import { businessApi } from '../../api/businessApi'
import { useAsync } from '../../hooks/useAsync'
import { useAutoRefresh } from '../../hooks/useAutoRefresh'
import { enquiryStatus, OFFER_STATES } from '../../lib/business'
import { formatDate } from '../../lib/format'
import { Button } from '../../components/ui/Button'
import { Alert, Badge, ErrorState, PageLoader } from '../../components/ui/Feedback'
import { CardHeader, GlassCard } from '../../components/ui/Surface'
import { BusinessAnalyticsCard } from '../../components/business/insights/BusinessAnalyticsCard'
import { TrendChart } from '../../components/business/insights/TrendChart'
import { ActivityTimeline } from '../../components/business/insights/ActivityTimeline'
import { relativeTime, SERIES_COLORS } from '../../components/business/insights/insightsUtils'
import { completionLink, kpis, offerValue } from '../../components/business/insights/kpis'
import { TopProductsList } from '../../components/business/insights/TopProductsList'
import { useBusiness } from './BusinessShell'
import shared from '../dashboard/Dashboard.module.scss'
import styles from '../../components/business/insights/Insights.module.scss'

export default function BusinessDashboardPage() {
  const { business, can } = useBusiness()
  const state = useAsync(() => businessApi.dashboard(business.id), [business.id])
  useAutoRefresh(() => businessApi.dashboard(business.id), state.setData, { intervalMs: 60_000 })
  const base = `/dashboard/business/${business.id}`

  if (state.loading && !state.data) return <PageLoader label="Loading your business dashboard…" />
  if (state.error || !state.data) return <ErrorState message={state.error ?? 'Unknown error'} onRetry={state.reload} />

  const d = state.data
  const a = d.analytics
  const published = d.business.status === 'Published'
  const canManage = can('Manager')

  return (
    <>
      <div className={shared.pageHeader}>
        <div>
          <div className={styles.titleRow}>
            <h1>{d.business.name}</h1>
            <Badge tone={published ? 'green' : 'amber'}>{published ? 'Published' : 'Draft'}</Badge>
          </div>
          <p>
            {d.business.categoryName}
            {d.business.city ? ` · ${d.business.city}` : ''} — performance over the last {a.days} days.
          </p>
        </div>
        <div className={shared.headerActions}>
          {canManage && (
            <Button to={`${base}/profile`} variant="secondary" icon={<Pencil />}>
              Edit profile
            </Button>
          )}
          {published && (
            <Button href={`/business/${d.business.slug}`} target="_blank" variant="outline" iconRight={<ExternalLink />}>
              View storefront
            </Button>
          )}
        </div>
      </div>

      {!published && (
        <div className={styles.alertRow}>
          <Alert tone="info">
            <strong>Your business profile is still a draft.</strong> Customers can’t see it and your QR code won’t open it yet.{' '}
            {canManage ? (
              <>
                Finish the details below, then <Link to={`${base}/settings`} style={{ textDecoration: 'underline' }}>publish it</Link>.
              </>
            ) : (
              'Ask the owner or a manager to publish it.'
            )}
          </Alert>
        </div>
      )}

      <div className={styles.kpiGrid}>
        {kpis(a.totals, a.previousTotals).map((k) => (
          <BusinessAnalyticsCard key={k.key} label={k.label} value={k.value} previous={k.previous} icon={k.icon} gold={k.gold} hint={k.hint} />
        ))}
      </div>

      <div className={styles.layout}>
        <div className={styles.column}>
          <GlassCard>
            <CardHeader
              title="Visits and scans"
              subtitle={`Daily profile views and QR scans, ${formatDate(a.from)} – ${formatDate(a.to)}`}
              action={
                <Button to={`${base}/analytics`} size="sm" variant="ghost" iconRight={<ArrowRight />}>
                  Analytics
                </Button>
              }
            />
            <TrendChart
              title="Daily profile views and QR scans"
              series={[
                { key: 'views', label: 'Profile views', color: SERIES_COLORS.views },
                { key: 'scans', label: 'QR scans', color: SERIES_COLORS.scans },
              ]}
              points={a.daily.map((p) => ({ date: p.date, values: { views: p.views, scans: p.scans } }))}
            />
          </GlassCard>

          <GlassCard>
            <CardHeader
              title="Recent enquiries"
              subtitle={d.newEnquiries ? `${d.newEnquiries} new enquir${d.newEnquiries === 1 ? 'y' : 'ies'} waiting` : 'You’re all caught up'}
              action={
                canManage && (
                  <Button to={`${base}/enquiries`} size="sm" variant="ghost" iconRight={<ArrowRight />}>
                    All enquiries
                  </Button>
                )
              }
            />
            {!canManage ? (
              <p className={styles.mutedNote}>Enquiry details are visible to the owner and managers.</p>
            ) : d.recentEnquiries.length === 0 ? (
              <p className={styles.mutedNote}>No enquiries yet. Customers can send one from your storefront.</p>
            ) : (
              <div>
                {d.recentEnquiries.map((e) => {
                  const s = enquiryStatus(e.status)
                  return (
                    <Link key={e.id} to={`${base}/enquiries?open=${e.id}`} className={shared.listRow}>
                      <span className={shared.modeIcon}>
                        <Inbox />
                      </span>
                      <div className={shared.listRowMain}>
                        <strong>
                          {e.customerName} <Badge tone={s.tone}>{s.label}</Badge>
                        </strong>
                        <span>{e.subject}</span>
                      </div>
                      <span className={shared.muted}>{relativeTime(e.createdAt)}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <CardHeader title="Top viewed products" subtitle="Last 30 days" />
            <TopProductsList items={a.topProducts} />
          </GlassCard>
        </div>

        <div className={styles.column}>
          <GlassCard>
            <CardHeader title="Profile completion" action={<strong className={shared.progressValue}>{d.completion.percent}%</strong>} />
            <div className={shared.progressTrack}>
              <div className={shared.progressBar} style={{ width: `${d.completion.percent}%` }} />
            </div>
            {d.completion.missing.length > 0 && (
              <ul className={styles.missingList} aria-label="Still to do">
                {d.completion.missing.map((m) => (
                  <li key={m}>
                    <Link to={completionLink(base, m)}>+ {m}</Link>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>

          <GlassCard>
            <div className={styles.qrStatus}>
              <span className={[styles.qrBadge, !d.qrEnabled && styles.qrBadgeOff].filter(Boolean).join(' ')}>
                {d.qrEnabled ? <QrCode /> : <ShieldOff />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>QR code {d.qrEnabled ? 'active' : 'disabled'}</strong>
                <p className={shared.muted}>
                  {!d.qrEnabled ? 'Scans show a “turned off” message.' : published ? `${a.totals.qrScans} scans in the last ${a.days} days` : 'Publish to make scans open your storefront.'}
                </p>
              </div>
              <Button to={`${base}/qr`} size="sm" variant="secondary">
                Manage
              </Button>
            </div>
          </GlassCard>

          <GlassCard>
            <CardHeader title="Catalogue" />
            <div className={styles.counts}>
              <Link to={`${base}/products`}>
                <strong>{d.productCount}</strong>
                <span>Products</span>
              </Link>
              <Link to={`${base}/services`}>
                <strong>{d.serviceCount}</strong>
                <span>Services</span>
              </Link>
              <Link to={`${base}/gallery`}>
                <strong>{d.galleryCount}</strong>
                <span>Photos</span>
              </Link>
            </div>
            {d.pendingReviews > 0 && (
              <p className={shared.muted} style={{ marginTop: 12 }}>
                <Link to={`${base}/reviews`} style={{ color: 'var(--q-purple-primary)', fontWeight: 600 }}>
                  {d.pendingReviews} review{d.pendingReviews === 1 ? '' : 's'} awaiting approval →
                </Link>
              </p>
            )}
          </GlassCard>

          <GlassCard>
            <CardHeader
              title="Active offers"
              action={
                <Button to={`${base}/offers`} size="sm" variant="ghost" icon={<Tag />}>
                  Offers
                </Button>
              }
            />
            {d.activeOffers.length === 0 ? (
              <p className={styles.mutedNote}>No live offers right now.</p>
            ) : (
              d.activeOffers.map((o) => (
                <div key={o.id} className={styles.offerRow}>
                  <div>
                    <strong>{o.title}</strong>
                    <span>
                      <Badge tone={OFFER_STATES[o.state].tone}>{OFFER_STATES[o.state].label}</Badge>
                      {o.endDate ? ` Ends ${formatDate(o.endDate)}` : ' No end date'}
                    </span>
                  </div>
                  {offerValue(o) && <span className={styles.offerValue}>{offerValue(o)}</span>}
                </div>
              ))
            )}
          </GlassCard>

          <GlassCard>
            <CardHeader title="Recent activity" />
            <ActivityTimeline items={d.recentActivity} />
          </GlassCard>
        </div>
      </div>
    </>
  )
}
