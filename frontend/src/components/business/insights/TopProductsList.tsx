import { assetUrl } from '../../../lib/url'
import type { TopProduct } from '../../../types/business'
import styles from './Insights.module.scss'

export function TopProductsList({ items }: { items: TopProduct[] }) {
  if (!items.length) return <p className={styles.mutedNote}>No product views yet in this period.</p>
  return (
    <ol className={styles.topProducts}>
      {items.map((p, i) => (
        <li key={p.productId}>
          <span className={[styles.rank, i === 0 && styles.rankFirst].filter(Boolean).join(' ')}>{i + 1}</span>
          {p.imageUrl ? <img src={assetUrl(p.imageUrl)} alt="" className={styles.thumb} loading="lazy" /> : <span className={styles.thumb} aria-hidden />}
          <span className={styles.productName}>{p.name}</span>
          <span className={styles.productViews}>{p.views} views</span>
        </li>
      ))}
    </ol>
  )
}

