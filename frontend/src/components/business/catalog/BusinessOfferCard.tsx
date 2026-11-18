import { CalendarDays, Pencil, Star, Trash2 } from 'lucide-react'
import { Badge } from '../../ui/Feedback'
import { Toggle } from '../../ui/Surface'
import { assetUrl } from '../../../lib/url'
import { formatDate, formatMoney } from '../../../lib/format'
import { OFFER_STATES } from '../../../lib/business'
import type { Offer } from '../../../types/business'
import shared from '../../../pages/dashboard/Dashboard.module.scss'
import styles from './Catalog.module.scss'

export function discountLabel(o: { discountPercent: number | null; discountAmountInPaise: number | null }) {
  if (o.discountPercent) return `${o.discountPercent}% off`
  if (o.discountAmountInPaise) return `${formatMoney(o.discountAmountInPaise)} off`
  return null
}

export function offerDates(o: { startDate: string | null; endDate: string | null }) {
  if (o.startDate && o.endDate) return `${formatDate(o.startDate)} – ${formatDate(o.endDate)}`
  if (o.endDate) return `Until ${formatDate(o.endDate)}`
  if (o.startDate) return `From ${formatDate(o.startDate)}`
  return 'No end date'
}

export function BusinessOfferCard({
  offer,
  busy,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  offer: Offer
  busy?: boolean
  onEdit: () => void
  onToggleActive: (value: boolean) => void
  onDelete: () => void
}) {
  const banner = assetUrl(offer.bannerUrl)
  const state = OFFER_STATES[offer.state]
  const discount = discountLabel(offer)
  return (
    <article className={[styles.itemCard, offer.isFeatured && styles.featuredCard].filter(Boolean).join(' ')}>
      <div className={styles.offerBanner}>
        {banner ? <img src={banner} alt="" loading="lazy" /> : <span className={styles.offerHeadline}>{discount ?? offer.title}</span>}
        <span className={styles.mediaBadges}>
          <Badge tone={state.tone}>{state.label}</Badge>
          {offer.isFeatured && (
            <Badge tone="gold">
              <Star /> Featured
            </Badge>
          )}
        </span>
      </div>
      <div className={styles.offerBody}>
        <div className={styles.itemMain}>
          <h3>{offer.title}</h3>
          {discount && <span className={styles.discount}>{discount}</span>}
          {offer.description && <p>{offer.description}</p>}
        </div>
        <span className={styles.dates}>
          <CalendarDays aria-hidden /> {offerDates(offer)}
        </span>
      </div>
      <div className={styles.cardActions}>
        <Toggle checked={offer.isActive} disabled={busy} label={`${offer.title} active`} onChange={onToggleActive} />
        <button type="button" className={shared.iconBtn} aria-label={`Edit ${offer.title}`} onClick={onEdit}>
          <Pencil />
        </button>
        <button
          type="button"
          className={[shared.iconBtn, shared.iconBtnDanger].join(' ')}
          aria-label={`Delete ${offer.title}`}
          disabled={busy}
          onClick={onDelete}
        >
          <Trash2 />
        </button>
      </div>
    </article>
  )
}
