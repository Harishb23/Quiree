import { useState } from 'react'
import { Globe, MapPin, MessageCircle, Phone, Share2, ShieldCheck } from 'lucide-react'
import { businessApi } from '../../api/businessApi'
import { useAsync } from '../../hooks/useAsync'
import { formatDate } from '../../lib/format'
import { ErrorState, PageLoader, Spinner } from '../../components/ui/Feedback'
import { CardHeader, GlassCard } from '../../components/ui/Surface'
import { FilterTabs } from '../../components/ui/Widgets'
import { BusinessAnalyticsCard } from '../../components/business/insights/BusinessAnalyticsCard'
import { TrendChart } from '../../components/business/insights/TrendChart'
import { BarBreakdown } from '../../components/business/insights/BarBreakdown'
import { TopProductsList } from '../../components/business/insights/TopProductsList'
import { kpis } from '../../components/business/insights/kpis'
import { SERIES_COLORS } from '../../components/business/insights/insightsUtils'
import { useBusiness } from './BusinessShell'
import shared from '../dashboard/Dashboard.module.scss'
import styles from '../../components/business/insights/Insights.module.scss'

type Period = '7' | '30' | '90'

export default function BusinessAnalyticsPage() {
  const { business } = useBusiness()
  const [period, setPeriod] = useState<Period>('30')
  const state = useAsync(() => businessApi.analytics(business.id, Number(period)), [business.id, period])
  const a = state.data

  return (
    <>
      <div className={shared.pageHeader}>
        <div>
          <h1>Analytics</h1>
          <p>How customers find and engage with {business.name}. Changes compare with the previous period of the same length.</p>
        </div>
        <FilterTabs<Period>
          label="Period"
          value={period}
          onChange={setPeriod}
          options={[
            { value: '7', label: '7 days' },
            { value: '30', label: '30 days' },
            { value: '90', label: '90 days' },
          ]}
        />
      </div>

      {state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : !a ? (
        <PageLoader label="Loading analytics…" />
      ) : (
        <div aria-busy={state.loading}>
          {state.loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <Spinner size={18} label="Updating" />
            </div>
          )}
          <div className={styles.kpiGrid}>
            {kpis(a.totals, a.previousTotals).map((k) => (
              <BusinessAnalyticsCard key={k.key} label={k.label} value={k.value} previous={k.previous} icon={k.icon} gold={k.gold} hint={k.hint} />
            ))}
          </div>

          <div className={shared.stack}>
            <GlassCard>
              <CardHeader title="Daily traffic" subtitle={`${formatDate(a.from)} – ${formatDate(a.to)}`} />
              <TrendChart
                title="Daily profile views, QR scans and unique visitors"
                series={[
                  { key: 'views', label: 'Profile views', color: SERIES_COLORS.views },
                  { key: 'scans', label: 'QR scans', color: SERIES_COLORS.scans },
                  { key: 'visitors', label: 'Unique visitors', color: SERIES_COLORS.visitors },
                ]}
                points={a.daily.map((p) => ({ date: p.date, values: { views: p.views, scans: p.scans, visitors: p.visitors } }))}
              />
            </GlassCard>

            <div className={shared.grid2}>
              <GlassCard>
                <CardHeader title="Customer actions" subtitle="Taps on your storefront’s contact buttons" />
                <BarBreakdown
                  emptyText="No taps on your contact buttons in this period yet."
                  items={[
                    { key: 'whatsapp', label: 'WhatsApp', value: a.totals.whatsAppClicks, icon: <MessageCircle aria-hidden /> },
                    { key: 'call', label: 'Call', value: a.totals.callClicks, icon: <Phone aria-hidden /> },
                    { key: 'website', label: 'Website', value: a.totals.websiteClicks, icon: <Globe aria-hidden /> },
                    { key: 'directions', label: 'Directions', value: a.totals.directionsClicks, icon: <MapPin aria-hidden /> },
                    { key: 'share', label: 'Share', value: a.totals.shareClicks, icon: <Share2 aria-hidden /> },
                  ]}
                />
              </GlassCard>
              <GlassCard>
                <CardHeader title="Top viewed products" subtitle={`Last ${a.days} days`} />
                <TopProductsList items={a.topProducts} />
              </GlassCard>
            </div>
          </div>

          <p className={styles.privacy}>
            <ShieldCheck aria-hidden />
            <span>
              Analytics are anonymous: we never store visitors’ IP addresses or identities. Search-engine bots, link previews
              and visits from your own team aren’t counted, and repeat actions by the same visitor within 30 minutes count once.
              Unique visitors are counted per day.
            </span>
          </p>
        </div>
      )}
    </>
  )
}
