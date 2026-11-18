import { Star } from 'lucide-react'
import styles from './Insights.module.scss'

export function Stars({ rating }: { rating: number }) {
  return (
    <span className={styles.stars} role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} fill={i <= rating ? 'currentColor' : 'none'} className={i <= rating ? undefined : styles.starEmpty} aria-hidden />
      ))}
    </span>
  )
}

