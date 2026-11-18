import { Link } from 'react-router-dom'
import { Eye, EyeOff, Package, Pencil, Star, Trash2 } from 'lucide-react'
import { Badge } from '../../ui/Feedback'
import { assetUrl } from '../../../lib/url'
import { formatMoney } from '../../../lib/format'
import { discountPercent, STOCK_LABELS, STOCK_TONES } from '../../../lib/business'
import type { Product } from '../../../types/business'
import shared from '../../../pages/dashboard/Dashboard.module.scss'
import styles from './Catalog.module.scss'

/** Price line shared by product cards: discount price, struck-through regular price and % off. */
export function PriceTag({ price, discount, currency = 'INR' }: { price: number | null; discount: number | null; currency?: string }) {
  if (price == null) return <span className={styles.onRequest}>Price on request</span>
  const off = discountPercent(price, discount)
  return (
    <span className={styles.price}>
      <strong>{formatMoney(off ? discount! : price, currency)}</strong>
      {off && <s>{formatMoney(price, currency)}</s>}
      {off && <span className={styles.off}>{off}% off</span>}
    </span>
  )
}

export function BusinessProductCard({
  product,
  editTo,
  busy,
  onToggleFeatured,
  onToggleAvailable,
  onDelete,
}: {
  product: Product
  editTo: string
  busy?: boolean
  onToggleFeatured: () => void
  onToggleAvailable: () => void
  onDelete: () => void
}) {
  const cover = assetUrl(product.images[0]?.url)
  return (
    <article className={styles.productCard}>
      <Link to={editTo} className={styles.productMedia} aria-label={`Edit ${product.name}`}>
        {cover ? <img src={cover} alt="" loading="lazy" /> : <Package aria-hidden />}
        <span className={styles.mediaBadges}>
          {product.isFeatured && (
            <Badge tone="gold">
              <Star /> Featured
            </Badge>
          )}
          {!product.isAvailable && <Badge tone="gray">Hidden</Badge>}
        </span>
      </Link>
      <div className={styles.productBody}>
        <h3 title={product.name}>{product.name}</h3>
        <span className={styles.meta}>
          {[product.productCategoryName ?? 'Uncategorised', product.sku].filter(Boolean).join(' · ')}
        </span>
        <PriceTag price={product.priceInPaise} discount={product.discountPriceInPaise} currency={product.currency} />
        <div>
          <Badge tone={STOCK_TONES[product.stock]}>{STOCK_LABELS[product.stock]}</Badge>
        </div>
      </div>
      <div className={styles.cardActions}>
        <Link to={editTo} className={shared.iconBtn} aria-label={`Edit ${product.name}`}>
          <Pencil />
        </Link>
        <button
          type="button"
          className={[shared.iconBtn, product.isFeatured && styles.iconBtnActive].filter(Boolean).join(' ')}
          aria-pressed={product.isFeatured}
          aria-label={product.isFeatured ? `Unfeature ${product.name}` : `Feature ${product.name}`}
          title={product.isFeatured ? 'Remove from featured' : 'Mark as featured'}
          disabled={busy}
          onClick={onToggleFeatured}
        >
          <Star />
        </button>
        <button
          type="button"
          className={shared.iconBtn}
          aria-label={product.isAvailable ? `Hide ${product.name}` : `Show ${product.name}`}
          title={product.isAvailable ? 'Hide from storefront' : 'Show on storefront'}
          disabled={busy}
          onClick={onToggleAvailable}
        >
          {product.isAvailable ? <Eye /> : <EyeOff />}
        </button>
        <button
          type="button"
          className={[shared.iconBtn, shared.iconBtnDanger].join(' ')}
          aria-label={`Delete ${product.name}`}
          disabled={busy}
          onClick={onDelete}
        >
          <Trash2 />
        </button>
      </div>
    </article>
  )
}
