import {
  Eye,
  Globe,
  Inbox,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  QrCode,
  Share2,
  Star,
  Activity,
  type LucideIcon,
} from 'lucide-react'
import type { ActivityItem } from '../../../types/business'
import { relativeTime } from './insightsUtils'
import styles from './Insights.module.scss'

const icons: Record<string, LucideIcon> = {
  scan: QrCode,
  view: Eye,
  product: Package,
  whatsapp: MessageCircle,
  call: Phone,
  website: Globe,
  directions: MapPin,
  share: Share2,
  enquiry: Inbox,
  review: Star,
}

/** Enquiries, reviews and QR scans are the "important" moments and get a gold marker. */
const important = new Set(['enquiry', 'review', 'scan'])

export function ActivityTimeline({ items, now }: { items: ActivityItem[]; now?: Date }) {
  if (!items.length) return <p className={styles.mutedNote}>No activity yet. Share your QR code to start seeing visits here.</p>
  return (
    <ol className={styles.timeline}>
      {items.map((item, i) => {
        const Icon = icons[item.kind] ?? Activity
        return (
          <li key={`${item.kind}-${item.occurredAt}-${i}`} className={styles.timelineItem}>
            <span className={[styles.timelineIcon, important.has(item.kind) && styles.timelineIconGold].filter(Boolean).join(' ')} aria-hidden>
              <Icon />
            </span>
            <div className={styles.timelineBody}>
              <strong>{item.title}</strong>
              {item.detail && <span>{item.detail}</span>}
            </div>
            <time dateTime={item.occurredAt} className={styles.timelineTime}>
              {relativeTime(item.occurredAt, now)}
            </time>
          </li>
        )
      })}
    </ol>
  )
}
