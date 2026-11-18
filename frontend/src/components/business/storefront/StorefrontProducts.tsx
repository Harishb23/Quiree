import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, MessageSquareText, Package, Search, Sparkles } from 'lucide-react'
import { publicBusinessApi } from '../../../api/businessApi'
import { getErrorMessage } from '../../../api/client'
import { discountPercent, STOCK_LABELS } from '../../../lib/business'
import { formatMoney } from '../../../lib/format'
import { assetUrl } from '../../../lib/url'
import type { PagedResult, ProductCategory, PublicProduct } from '../../../types/business'
import { Button } from '../../ui/Button'
import { EmptyState, ErrorState, Skeleton } from '../../ui/Feedback'
import { TextField } from '../../ui/Field'
import { Modal } from '../../ui/Surface'
import { Pagination } from '../../ui/Widgets'
import styles from './Storefront.module.scss'

export function Price({
  price,
  discount,
  currency,
  large,
}: {
  price: number | null
  discount: number | null
  currency: string
  large?: boolean
}) {
  if (price == null) return <span className={styles.priceOnRequest}>Price on request</span>
  const off = discountPercent(price, discount)
  return (
    <span className={[styles.price, large && styles.priceLarge].filter(Boolean).join(' ')}>
      <strong>{formatMoney(off ? discount! : price, currency)}</strong>
      {off && (
        <>
          <s>{formatMoney(price, currency)}</s>
          <em className={styles.offBadge}>{off}% off</em>
        </>
      )}
    </span>
  )
}

export function ProductCard({ product, onOpen }: { product: PublicProduct; onOpen: (p: PublicProduct) => void }) {
  const image = assetUrl(product.images[0])
  return (
    <button type="button" className={styles.productCard} onClick={() => onOpen(product)}>
      <span className={styles.productImage}>
        {image ? <img src={image} alt="" loading="lazy" decoding="async" /> : <Package aria-hidden />}
        {product.isFeatured && (
          <span className={styles.featuredTag}>
            <Sparkles aria-hidden /> Featured
          </span>
        )}
        {product.stock === 'OutOfStock' && <span className={styles.soldOut}>Out of stock</span>}
      </span>
      <span className={styles.productBody}>
        {product.categoryName && <span className={styles.productCategory}>{product.categoryName}</span>}
        <span className={styles.productName}>{product.name}</span>
        <Price price={product.priceInPaise} discount={product.discountPriceInPaise} currency={product.currency} />
      </span>
    </button>
  )
}

export function ProductGrid({ products, layout, onOpen }: { products: PublicProduct[]; layout: 'grid' | 'list'; onOpen: (p: PublicProduct) => void }) {
  return (
    <div className={layout === 'list' ? styles.productList : styles.productGrid}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onOpen={onOpen} />
      ))}
    </div>
  )
}

/** Product detail with image carousel, prices, stock, attributes and an enquiry shortcut. */
export function ProductModal({
  product,
  onClose,
  onEnquire,
}: {
  product: PublicProduct | null
  onClose: () => void
  onEnquire: (p: PublicProduct) => void
}) {
  const [index, setIndex] = useState(0)
  useEffect(() => setIndex(0), [product?.id])
  if (!product) return null
  const images = product.images.map((u) => assetUrl(u)).filter(Boolean) as string[]
  const go = (delta: number) => setIndex((i) => (i + delta + images.length) % images.length)

  return (
    <Modal open title={product.name} size="lg" onClose={onClose}>
      <div className={styles.productDetail}>
        <div className={styles.carousel}>
          {images.length ? (
            <>
              <img src={images[index]} alt={`${product.name} — image ${index + 1} of ${images.length}`} decoding="async" />
              {images.length > 1 && (
                <>
                  <button type="button" className={[styles.carouselBtn, styles.carouselPrev].join(' ')} onClick={() => go(-1)} aria-label="Previous image">
                    <ChevronLeft />
                  </button>
                  <button type="button" className={[styles.carouselBtn, styles.carouselNext].join(' ')} onClick={() => go(1)} aria-label="Next image">
                    <ChevronRight />
                  </button>
                  <div className={styles.dots}>
                    {images.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Show image ${i + 1}`}
                        aria-current={i === index}
                        className={i === index ? styles.dotActive : undefined}
                        onClick={() => setIndex(i)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <span className={styles.carouselEmpty}>
              <Package aria-hidden />
            </span>
          )}
        </div>
        <div className={styles.productInfo}>
          {product.categoryName && <span className={styles.productCategory}>{product.categoryName}</span>}
          <Price price={product.priceInPaise} discount={product.discountPriceInPaise} currency={product.currency} large />
          <span className={[styles.stock, styles[`stock_${product.stock}`]].join(' ')}>{STOCK_LABELS[product.stock]}</span>
          {product.description && <p className={styles.productDescription}>{product.description}</p>}
          {product.attributes.length > 0 && (
            <dl className={styles.attributes}>
              {product.attributes.map((a) => (
                <div key={a.key}>
                  <dt>{a.label}</dt>
                  <dd>{a.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <Button icon={<MessageSquareText />} className={styles.brandButton} onClick={() => onEnquire(product)}>
            Enquire about this
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/** "View all products": server-side search, category filter and pagination. */
export function ProductBrowser({
  slug,
  categories,
  layout,
  onOpen,
}: {
  slug: string
  categories: ProductCategory[]
  layout: 'grid' | 'list'
  onOpen: (p: PublicProduct) => void
}) {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<PagedResult<PublicProduct> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  // Debounce typing so we don't query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    publicBusinessApi
      .products(slug, { search: query || undefined, categoryId: categoryId || undefined, page, pageSize: 12 })
      .then((r) => !cancelled && setResult(r))
      .catch((e) => !cancelled && setError(getErrorMessage(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [slug, query, categoryId, page, attempt])

  return (
    <div className={styles.browser}>
      <TextField
        label="Search products"
        icon={<Search />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or description"
        type="search"
      />
      {categories.length > 0 && (
        <div className={styles.chips} role="group" aria-label="Filter by category">
          <button type="button" className={!categoryId ? styles.chipActive : styles.chip} aria-pressed={!categoryId} onClick={() => { setCategoryId(''); setPage(1) }}>
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={categoryId === c.id ? styles.chipActive : styles.chip}
              aria-pressed={categoryId === c.id}
              onClick={() => {
                setCategoryId(c.id)
                setPage(1)
              }}
            >
              {c.name} <span>{c.productCount}</span>
            </button>
          ))}
        </div>
      )}
      {error ? (
        <ErrorState message={error} onRetry={() => setAttempt((a) => a + 1)} />
      ) : loading && !result ? (
        <div className={styles.productGrid}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={220} radius={16} />
          ))}
        </div>
      ) : result && result.items.length === 0 ? (
        <EmptyState icon={<Search />} title="No products found" description="Try a different search or category." />
      ) : (
        result && (
          <div aria-busy={loading} style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .2s' }}>
            <ProductGrid products={result.items} layout={layout} onOpen={onOpen} />
            <Pagination page={result.page} pageSize={result.pageSize} total={result.total} onChange={setPage} />
          </div>
        )
      )}
    </div>
  )
}
