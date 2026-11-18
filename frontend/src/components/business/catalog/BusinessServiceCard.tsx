import { Clock, Pencil, Star, Trash2, Wrench } from 'lucide-react'
import { Badge } from '../../ui/Feedback'
import { Toggle } from '../../ui/Surface'
import { assetUrl } from '../../../lib/url'
import { formatMoney } from '../../../lib/format'
import { formatDuration } from '../../../lib/business'
import type { BusinessServiceItem } from '../../../types/business'
import shared from '../../../pages/dashboard/Dashboard.module.scss'
import styles from './Catalog.module.scss'

export function servicePriceLabel(s: { priceInPaise: number | null; priceNote: string | null; currency: string }) {
  if (s.priceInPaise == null) return s.priceNote || 'Price on request'
  const amount = formatMoney(s.priceInPaise, s.currency)
  return s.priceNote ? `${amount} · ${s.priceNote}` : amount
}

export function BusinessServiceCard({
  service,
  busy,
  onEdit,
  onToggleAvailable,
  onDelete,
}: {
  service: BusinessServiceItem
  busy?: boolean
  onEdit: () => void
  onToggleAvailable: (value: boolean) => void
  onDelete: () => void
}) {
  const image = assetUrl(service.imageUrl)
  return (
    <article className={[styles.itemCard, service.isFeatured && styles.featuredCard].filter(Boolean).join(' ')}>
      <div className={styles.serviceHead}>
        <div className={styles.serviceThumb}>{image ? <img src={image} alt="" loading="lazy" /> : <Wrench aria-hidden />}</div>
        <div className={styles.itemMain}>
          <h3>{service.name}</h3>
          <span className={styles.discount} style={{ fontSize: 15 }}>
            {servicePriceLabel(service)}
          </span>
          {service.description && <p>{service.description}</p>}
          <div className={styles.chips}>
            {service.durationMinutes && (
              <Badge tone="violet">
                <Clock /> {formatDuration(service.durationMinutes)}
              </Badge>
            )}
            {service.isFeatured && (
              <Badge tone="gold">
                <Star /> Featured
              </Badge>
            )}
            {!service.isAvailable && <Badge tone="gray">Hidden</Badge>}
          </div>
        </div>
      </div>
      <div className={styles.cardActions}>
        <Toggle checked={service.isAvailable} disabled={busy} label={`Show ${service.name} on storefront`} onChange={onToggleAvailable} />
        <button type="button" className={shared.iconBtn} aria-label={`Edit ${service.name}`} onClick={onEdit}>
          <Pencil />
        </button>
        <button
          type="button"
          className={[shared.iconBtn, shared.iconBtnDanger].join(' ')}
          aria-label={`Delete ${service.name}`}
          disabled={busy}
          onClick={onDelete}
        >
          <Trash2 />
        </button>
      </div>
    </article>
  )
}
