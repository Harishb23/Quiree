import { ExternalLink, Plus, QrCode, Settings2, Store } from 'lucide-react'
import { businessApi } from '../../api/businessApi'
import { useAsync } from '../../hooks/useAsync'
import { assetUrl } from '../../lib/url'
import { ROLE_LABELS } from '../../lib/business'
import { Button } from '../../components/ui/Button'
import { Badge, EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback'
import { GlassCard } from '../../components/ui/Surface'
import { CategoryIcon } from '../../components/business/CategoryIcon'
import type { BusinessSummary } from '../../types/business'
import shared from '../dashboard/Dashboard.module.scss'
import styles from '../../components/business/profile/Profile.module.scss'

/** /dashboard/business — every business the user owns or helps manage. */
export default function BusinessListPage() {
  const list = useAsync(() => businessApi.mine())

  if (list.loading && !list.data) return <PageLoader label="Loading your businesses…" />
  if (list.error || !list.data) return <ErrorState message={list.error ?? 'Unknown error'} onRetry={list.reload} />

  const businesses = list.data

  return (
    <>
      <div className={shared.pageHeader}>
        <div>
          <h1>Business profiles</h1>
          <p>Digital storefronts for your shops and services — each with its own products, offers and QR code.</p>
        </div>
        {businesses.length > 0 && (
          <div className={shared.headerActions}>
            <Button to="/dashboard/business/new" icon={<Plus />}>
              Create business profile
            </Button>
          </div>
        )}
      </div>

      {businesses.length === 0 ? (
        <>
          <div className={styles.intro}>
            <div className={styles.introCard}>
              <span>
                <QrCode />
              </span>
              <div>
                <h3>QR codes &amp; enquiries</h3>
                <p>A permanent QR code for your counter, packaging and posters, plus customer enquiries and reviews in one place.</p>
              </div>
            </div>
            <div className={[styles.introCard, styles.introGold].join(' ')}>
              <span>
                <Store />
              </span>
              <div>
                <h3>Business profiles</h3>
                <p>A separate storefront for a shop or service: products, services, offers, opening hours, enquiries and a QR code for your counter.</p>
              </div>
            </div>
          </div>
          <EmptyState
            icon={<Store />}
            title="Create your first business profile"
            description="Set up in a few minutes. It stays a private draft until you publish it."
            action={
              <Button to="/dashboard/business/new" icon={<Plus />} size="lg">
                Create business profile
              </Button>
            }
          />
        </>
      ) : (
        <div className={styles.listGrid}>
          {businesses.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      )}
    </>
  )
}

function BusinessCard({ business: b }: { business: BusinessSummary }) {
  const logo = assetUrl(b.logoUrl)
  const published = b.status === 'Published'
  return (
    <GlassCard className={styles.businessCard}>
      <div className={styles.businessTop}>
        {logo ? (
          <img src={logo} alt="" className={styles.businessLogo} />
        ) : (
          <span className={styles.businessIcon}>
            <CategoryIcon name={b.categoryIcon} size={22} />
          </span>
        )}
        <div>
          <h3>{b.name}</h3>
          <p>{[b.categoryName, b.city].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <div className={styles.badgeRow}>
        <Badge tone={published ? 'green' : 'gray'}>{published ? 'Published' : 'Draft'}</Badge>
        {b.myRole !== 'Owner' && <Badge tone="violet">{ROLE_LABELS[b.myRole].label}</Badge>}
      </div>
      <div className={styles.cardActions}>
        <Button to={`/dashboard/business/${b.id}`} size="sm" icon={<Settings2 />}>
          Manage
        </Button>
        <Button to={`/dashboard/business/${b.id}/qr`} size="sm" variant="secondary" icon={<QrCode />}>
          QR code
        </Button>
        {published && (
          <Button href={`/business/${b.slug}`} target="_blank" size="sm" variant="ghost" iconRight={<ExternalLink />}>
            View storefront
          </Button>
        )}
      </div>
    </GlassCard>
  )
}
