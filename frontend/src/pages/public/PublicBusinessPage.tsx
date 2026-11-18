import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Store } from 'lucide-react'
import { publicBusinessApi } from '../../api/businessApi'
import { useAsync } from '../../hooks/useAsync'
import { config } from '../../config'
import { BusinessStorefront } from '../../components/business/storefront/BusinessStorefront'
import { Button } from '../../components/ui/Button'
import { ErrorState, Skeleton } from '../../components/ui/Feedback'
import { LogoMark } from '../../components/ui/Logo'
import styles from './PublicBusinessPage.module.scss'

function setMeta(name: string, content: string) {
  let tag = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.name = name
    document.head.appendChild(tag)
  }
  const previous = tag.content
  tag.content = content
  return () => {
    tag!.content = previous
  }
}

/** Public storefront at /business/:slug — no login required. */
export default function PublicBusinessPage() {
  const { slug = '' } = useParams()
  const state = useAsync(() => publicBusinessApi.get(slug), [slug])
  const tracked = useRef<string | null>(null)
  const business = state.data

  // One profile view per page load (the server also de-duplicates repeat visits).
  useEffect(() => {
    if (business && tracked.current !== business.slug) {
      tracked.current = business.slug
      publicBusinessApi.track(business.slug, 'ProfileView')
    }
  }, [business])

  useEffect(() => {
    if (!business) return
    const previousTitle = document.title
    document.title = `${business.name} · ${business.categoryName}${business.city ? ` in ${business.city}` : ''}`
    const restore = setMeta(
      'description',
      business.description?.slice(0, 160) ?? `${business.name} — ${business.categoryName}. View products, offers, hours and contact details.`,
    )
    return () => {
      document.title = previousTitle
      restore()
    }
  }, [business])

  if (state.loading && !business) {
    return (
      <div className={styles.loading} aria-busy="true" aria-label="Loading business">
        <Skeleton height={220} radius={0} />
        <div className={styles.loadingCard}>
          <Skeleton width={88} height={88} radius={22} />
          <Skeleton width="60%" height={26} />
          <Skeleton width="40%" height={16} />
          <Skeleton height={60} />
        </div>
        <div className={styles.loadingCard}>
          <Skeleton height={180} />
        </div>
      </div>
    )
  }

  // useAsync exposes the server message; a 404 reads "Business not found."
  const notFound = !state.error || /not found/i.test(state.error)
  if (state.error || !business) {
    return (
      <div className={styles.center}>
        {notFound ? (
          <div className={styles.missing}>
            <Store aria-hidden />
            <h1>This business isn’t available</h1>
            <p>The link may be wrong, or the business hasn’t published its profile yet.</p>
            <Button to="/" variant="outline">
              Go to {config.appName}
            </Button>
          </div>
        ) : (
          <ErrorState message={state.error ?? 'Unknown error'} onRetry={state.reload} />
        )}
      </div>
    )
  }

  return (
    <div className={`${styles.page} app-bg`}>
      <BusinessStorefront business={business} />
      <footer className={styles.footer}>
        <Link to="/">
          <LogoMark size={20} /> Powered by {config.appName}
        </Link>
      </footer>
    </div>
  )
}
