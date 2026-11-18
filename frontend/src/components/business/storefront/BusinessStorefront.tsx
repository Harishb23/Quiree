import { useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import {
  BadgeCheck,
  Bike,
  Clock,
  CreditCard,
  ExternalLink,
  Globe,
  Images,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Share2,
  ShoppingBag,
  Star,
  Store,
  Tag,
  Wrench,
  X,
} from 'lucide-react'
import { publicBusinessApi } from '../../../api/businessApi'
import { CategoryIcon } from '../CategoryIcon'
import {
  DAYS,
  directionsUrl,
  formatDuration,
  fullAddress,
  galleryLabel,
  nowInZone,
  openState,
  paymentLabel,
  whatsAppUrl,
} from '../../../lib/business'
import { formatDate, formatMoney } from '../../../lib/format'
import { shareLink } from '../../../lib/share'
import { assetUrl, mailHref, safeUrl, telHref, displayUrl } from '../../../lib/url'
import type { GalleryCategory, PublicBusiness, PublicProduct, SectionKey, TrackableEvent } from '../../../types/business'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Surface'
import { useToast } from '../../ui/Toast'
import { ProductBrowser, ProductGrid, ProductModal } from './StorefrontProducts'
import { EnquiryForm, ReviewForm, type RelatedOption } from './StorefrontForms'
import { brandVars } from './theme'
import styles from './Storefront.module.scss'

export interface BusinessStorefrontProps {
  business: PublicBusiness
  /** Preview mode (owner preview / wizard live preview): no analytics, enquiry & review forms disabled, "Preview" ribbon shown. */
  preview?: boolean
}

const ALL_SECTIONS: SectionKey[] = ['offers', 'products', 'services', 'gallery', 'reviews', 'info']

/** Section order chosen by the owner; anything they didn't list is appended so nothing important disappears. */
export function orderedSections(featured: SectionKey[]): SectionKey[] {
  const chosen = featured.filter((s) => ALL_SECTIONS.includes(s))
  return chosen.length ? chosen : ALL_SECTIONS
}

export function BusinessStorefront({ business: b, preview = false }: BusinessStorefrontProps) {
  const toast = useToast()
  const [openProduct, setOpenProduct] = useState<PublicProduct | null>(null)
  const [browseAll, setBrowseAll] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [enquiryPreset, setEnquiryPreset] = useState<{ related: string; subject: string; nonce: number } | null>(null)
  const [extraOption, setExtraOption] = useState<RelatedOption | null>(null)
  const enquiryRef = useRef<HTMLElement>(null)

  const track = (type: TrackableEvent, productId?: string) => {
    if (!preview) publicBusinessApi.track(b.slug, type, productId)
  }

  const open = useMemo(() => openState(b.workingHours, b.upcomingSpecialHours, b.timeZone), [b.workingHours, b.upcomingSpecialHours, b.timeZone])
  const address = fullAddress(b)
  // Only offer directions when we can actually locate the shop (a city alone isn't enough).
  const directions = b.mapsUrl || (b.latitude != null && b.longitude != null) || b.addressLine1 ? directionsUrl(b) : null
  const website = safeUrl(b.website)
  const cover = assetUrl(b.coverUrl)
  const logo = assetUrl(b.logoUrl)

  const enquiryOptions: RelatedOption[] = useMemo(() => {
    const opts: RelatedOption[] = [
      ...b.services.map((s) => ({ value: `service:${s.id}`, label: `Service · ${s.name}` })),
      ...b.featuredProducts.map((p) => ({ value: `product:${p.id}`, label: `Product · ${p.name}` })),
    ]
    if (extraOption && !opts.some((o) => o.value === extraOption.value)) opts.push(extraOption)
    return opts
  }, [b.services, b.featuredProducts, extraOption])

  function enquireAbout(kind: 'product' | 'service', id: string, name: string) {
    if (kind === 'product') setExtraOption({ value: `product:${id}`, label: `Product · ${name}` })
    setEnquiryPreset({ related: `${kind}:${id}`, subject: `Enquiry about ${name}`, nonce: Date.now() })
    setOpenProduct(null)
    setTimeout(() => enquiryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function openProductDetail(p: PublicProduct) {
    setOpenProduct(p)
    track('ProductView', p.id)
  }

  // Deep links from QR campaigns: /business/{slug}?open=product&id=… | products | offer | services | reviews | gallery | enquiry
  useEffect(() => {
    if (preview || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const target = params.get('open')
    if (!target) return
    const id = params.get('id')
    const scrollTo = (el: Element | null) => window.setTimeout(() => el?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250)
    if (target === 'product' && id) {
      const featured = b.featuredProducts.find((p) => p.id === id)
      if (featured) openProductDetail(featured)
      else publicBusinessApi.product(b.slug, id).then(openProductDetail).catch(() => scrollTo(document.getElementById('products')))
    } else if (target === 'products') {
      setBrowseAll(true)
      scrollTo(document.getElementById('products'))
    } else if (target === 'enquiry') {
      scrollTo(enquiryRef.current)
    } else {
      const section = target === 'offer' ? 'offers' : target
      if (['offers', 'services', 'reviews', 'gallery'].includes(section)) scrollTo(document.getElementById(section))
    }
    // Act once per page load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function share() {
    track('ShareClick')
    const result = await shareLink(b.publicUrl, b.name, b.description ?? undefined)
    if (result === 'copied') toast.success('Link copied to clipboard.')
  }

  const actions: { key: string; label: string; icon: ReactNode; href?: string; onClick?: () => void; external?: boolean; event?: TrackableEvent }[] = []
  if (b.phone) actions.push({ key: 'call', label: 'Call', icon: <Phone />, href: telHref(b.phone), event: 'CallClick' })
  if (b.whatsApp) actions.push({ key: 'wa', label: 'WhatsApp', icon: <MessageCircle />, href: whatsAppUrl(b.whatsApp, `Hi ${b.name}!`), external: true, event: 'WhatsAppClick' })
  if (directions) actions.push({ key: 'dir', label: 'Directions', icon: <Navigation />, href: directions, external: true, event: 'DirectionsClick' })
  if (website) actions.push({ key: 'web', label: 'Website', icon: <Globe />, href: website, external: true, event: 'WebsiteClick' })
  actions.push({ key: 'share', label: 'Share', icon: <Share2 />, onClick: share })

  const sectionContent: Record<SectionKey, ReactNode> = {
    offers: b.offers.length > 0 && (
      <Section id="offers" title="Offers & promotions" icon={<Tag />}>
        <div className={styles.offers}>
          {b.offers.map((o) => (
            <article key={o.id} className={[styles.offer, o.isFeatured && styles.offerFeatured].filter(Boolean).join(' ')}>
              {assetUrl(o.bannerUrl) && (
                <div className={styles.offerBanner}>
                  <img src={assetUrl(o.bannerUrl)} alt="" loading="lazy" decoding="async" />
                </div>
              )}
              <div className={styles.offerBody}>
                {(o.discountPercent || o.discountAmountInPaise) && (
                  <span className={styles.offerValue}>
                    {o.discountPercent ? `${o.discountPercent}% OFF` : `${formatMoney(o.discountAmountInPaise!)} OFF`}
                  </span>
                )}
                <h3>{o.title}</h3>
                {o.description && <p>{o.description}</p>}
                {o.endDate && <span className={styles.offerEnds}>Ends {formatDate(o.endDate)}</span>}
              </div>
            </article>
          ))}
        </div>
      </Section>
    ),
    products: b.totalProducts > 0 && (
      <Section
        id="products"
        title={browseAll ? 'All products' : b.featuredProducts.some((p) => p.isFeatured) ? 'Featured products' : 'Products'}
        icon={<ShoppingBag />}
        action={
          b.totalProducts > b.featuredProducts.length || browseAll ? (
            <Button variant="ghost" size="sm" onClick={() => setBrowseAll((v) => !v)} disabled={preview && !browseAll}>
              {browseAll ? 'Show featured' : `View all ${b.totalProducts}`}
            </Button>
          ) : undefined
        }
      >
        {browseAll && !preview ? (
          <ProductBrowser slug={b.slug} categories={b.productCategories} layout={b.layout} onOpen={openProductDetail} />
        ) : (
          <ProductGrid products={b.featuredProducts} layout={b.layout} onOpen={openProductDetail} />
        )}
      </Section>
    ),
    services: b.services.length > 0 && (
      <Section id="services" title="Services" icon={<Wrench />}>
        <div className={styles.services}>
          {b.services.map((s) => (
            <article key={s.id} className={styles.service}>
              {assetUrl(s.imageUrl) && <img src={assetUrl(s.imageUrl)} alt="" loading="lazy" decoding="async" className={styles.serviceImage} />}
              <div className={styles.serviceBody}>
                <h3>{s.name}</h3>
                {s.description && <p>{s.description}</p>}
                <div className={styles.serviceMeta}>
                  {s.priceInPaise != null && (
                    <strong>
                      {s.priceNote ? `${s.priceNote} ` : ''}
                      {formatMoney(s.priceInPaise, s.currency)}
                    </strong>
                  )}
                  {s.durationMinutes && (
                    <span>
                      <Clock aria-hidden /> {formatDuration(s.durationMinutes)}
                    </span>
                  )}
                </div>
              </div>
              <Button size="sm" variant="outline" className={styles.serviceEnquire} onClick={() => enquireAbout('service', s.id, s.name)}>
                Enquire
              </Button>
            </article>
          ))}
        </div>
      </Section>
    ),
    gallery: b.gallery.length > 0 && (
      <Section id="gallery" title="Gallery" icon={<Images />}>
        <GalleryGrid images={b.gallery} onOpen={setLightbox} />
      </Section>
    ),
    reviews: (b.reviews.length > 0 || !preview) && (
      <Section id="reviews" title="Customer reviews" icon={<Star />}>
        <Reviews business={b} preview={preview} />
      </Section>
    ),
    info: (
      <Section id="info" title="Business information" icon={<Store />}>
        <Info business={b} address={address} directions={directions} onTrack={track} />
      </Section>
    ),
  }

  return (
    <div className={[styles.storefront, styles[`theme_${b.theme}`]].filter(Boolean).join(' ')} style={brandVars(b.brandColor)}>
      {preview && <div className={styles.previewRibbon}>Preview — not visible to customers</div>}

      <header className={styles.hero}>
        <div className={styles.cover}>{cover ? <img src={cover} alt="" decoding="async" fetchPriority="high" /> : <span className={styles.coverFallback} />}</div>
        <div className={styles.heroCard}>
          <div className={styles.logo}>{logo ? <img src={logo} alt={`${b.name} logo`} decoding="async" /> : <CategoryIcon name={b.categoryIcon} size={34} />}</div>
          <div className={styles.heroText}>
            <h1>
              {b.name}
              {b.isVerified && (
                <span className={styles.verified} title="Verified business">
                  <BadgeCheck aria-label="Verified business" />
                </span>
              )}
            </h1>
            <p className={styles.category}>
              <CategoryIcon name={b.categoryIcon} size={15} />
              {[b.subcategoryName, b.categoryName].filter(Boolean).join(' · ')}
              {b.city && (
                <>
                  <span aria-hidden> · </span>
                  {b.city}
                </>
              )}
            </p>
            <div className={styles.heroChips}>
              {open && <span className={open.isOpen ? styles.openChip : styles.closedChip}>{open.label}</span>}
              {b.rating.count > 0 && (
                <a href="#reviews" className={styles.ratingChip}>
                  <Star aria-hidden /> {b.rating.average.toFixed(1)} <span>({b.rating.count})</span>
                </a>
              )}
              {b.deliveryAvailable && (
                <span className={styles.softChip}>
                  <Bike aria-hidden /> Delivery
                </span>
              )}
              {b.yearEstablished && <span className={styles.softChip}>Since {b.yearEstablished}</span>}
            </div>
            {b.description && <p className={styles.description}>{b.description}</p>}
          </div>
        </div>
      </header>

      <nav className={styles.actions} aria-label="Quick actions">
        {actions.map((a) =>
          a.href ? (
            <a
              key={a.key}
              href={a.href}
              className={styles.action}
              target={a.external ? '_blank' : undefined}
              rel={a.external ? 'noopener noreferrer' : undefined}
              onClick={() => a.event && track(a.event)}
            >
              {a.icon}
              <span>{a.label}</span>
            </a>
          ) : (
            <button key={a.key} type="button" className={styles.action} onClick={a.onClick}>
              {a.icon}
              <span>{a.label}</span>
            </button>
          ),
        )}
      </nav>

      <main className={styles.sections}>
        {orderedSections(b.featuredSections).map((key) => (
          <div key={key}>{sectionContent[key] || null}</div>
        ))}
        <Section id="enquire" title="Send an enquiry" icon={<Mail />} sectionRef={enquiryRef}>
          <EnquiryForm slug={b.slug} businessName={b.name} options={enquiryOptions} preset={enquiryPreset} disabled={preview} />
        </Section>
      </main>

      <ProductModal product={openProduct} onClose={() => setOpenProduct(null)} onEnquire={(p) => enquireAbout('product', p.id, p.name)} />
      {lightbox !== null && <Lightbox images={b.gallery} index={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />}
    </div>
  )
}

// ---------------------------------------------------------------------------

function Section({
  id,
  title,
  icon,
  action,
  children,
  sectionRef,
}: {
  id: string
  title: string
  icon: ReactNode
  action?: ReactNode
  children: ReactNode
  sectionRef?: Ref<HTMLElement>
}) {
  return (
    <section id={id} ref={sectionRef} className={styles.section} aria-labelledby={`${id}-title`}>
      <div className={styles.sectionHead}>
        <h2 id={`${id}-title`}>
          <span className={styles.sectionIcon}>{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function GalleryGrid({ images, onOpen }: { images: PublicBusiness['gallery']; onOpen: (index: number) => void }) {
  const [filter, setFilter] = useState<GalleryCategory | ''>('')
  const categories = Array.from(new Set(images.map((i) => i.category)))
  const shown = images.map((img, index) => ({ img, index })).filter(({ img }) => !filter || img.category === filter)
  return (
    <>
      {categories.length > 1 && (
        <div className={styles.chips} role="group" aria-label="Filter photos">
          <button type="button" className={!filter ? styles.chipActive : styles.chip} aria-pressed={!filter} onClick={() => setFilter('')}>
            All
          </button>
          {categories.map((c) => (
            <button key={c} type="button" className={filter === c ? styles.chipActive : styles.chip} aria-pressed={filter === c} onClick={() => setFilter(c)}>
              {galleryLabel(c)}
            </button>
          ))}
        </div>
      )}
      <div className={styles.gallery}>
        {shown.map(({ img, index }) => (
          <button key={img.url} type="button" className={styles.galleryItem} onClick={() => onOpen(index)} aria-label={img.caption ?? `Open photo ${index + 1}`}>
            <img src={assetUrl(img.url)} alt={img.caption ?? ''} loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
    </>
  )
}

function Lightbox({
  images,
  index,
  onChange,
  onClose,
}: {
  images: PublicBusiness['gallery']
  index: number
  onChange: (i: number) => void
  onClose: () => void
}) {
  const img = images[index]!
  return (
    <Modal open title={img.caption ?? galleryLabel(img.category)} size="xl" onClose={onClose}>
      <div className={styles.lightbox}>
        <img src={assetUrl(img.url)} alt={img.caption ?? ''} decoding="async" />
        {images.length > 1 && (
          <div className={styles.lightboxNav}>
            <Button variant="secondary" size="sm" onClick={() => onChange((index - 1 + images.length) % images.length)}>
              Previous
            </Button>
            <span>
              {index + 1} / {images.length}
            </span>
            <Button variant="secondary" size="sm" onClick={() => onChange((index + 1) % images.length)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

function Reviews({ business: b, preview }: { business: PublicBusiness; preview: boolean }) {
  const [writing, setWriting] = useState(false)
  const max = Math.max(1, ...b.rating.distribution)
  return (
    <div className={styles.reviews}>
      {b.rating.count > 0 ? (
        <div className={styles.ratingSummary}>
          <div className={styles.ratingBig}>
            <strong>{b.rating.average.toFixed(1)}</strong>
            <Stars value={b.rating.average} />
            <span>
              {b.rating.count} review{b.rating.count === 1 ? '' : 's'}
            </span>
          </div>
          <div className={styles.distribution}>
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className={styles.distRow}>
                <span>{star}★</span>
                <span className={styles.distBar}>
                  <span style={{ width: `${(b.rating.distribution[star - 1]! / max) * 100}%` }} />
                </span>
                <span>{b.rating.distribution[star - 1]}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className={styles.muted}>No reviews yet — be the first to share your experience.</p>
      )}
      {b.reviews.map((r, i) => (
        <article key={`${r.customerName}-${r.createdAt}-${i}`} className={styles.review}>
          <div className={styles.reviewHead}>
            <strong>{r.customerName}</strong>
            <Stars value={r.rating} />
            <time dateTime={r.createdAt}>{formatDate(r.createdAt)}</time>
          </div>
          {r.comment && <p>{r.comment}</p>}
          {r.ownerReply && (
            <p className={styles.ownerReply}>
              <strong>Reply from {b.name}:</strong> {r.ownerReply}
            </p>
          )}
        </article>
      ))}
      {writing ? (
        <div className={styles.reviewForm}>
          <div className={styles.reviewFormHead}>
            <strong>Write a review</strong>
            <button type="button" className={styles.closeSmall} onClick={() => setWriting(false)} aria-label="Close review form">
              <X />
            </button>
          </div>
          <ReviewForm slug={b.slug} disabled={preview} />
        </div>
      ) : (
        <Button variant="outline" size="sm" icon={<Star />} onClick={() => setWriting(true)}>
          Write a review
        </Button>
      )}
    </div>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <span className={styles.stars} aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden className={n <= Math.round(value) ? styles.starFilled : undefined} />
      ))}
    </span>
  )
}

function Info({
  business: b,
  address,
  directions,
  onTrack,
}: {
  business: PublicBusiness
  address: string
  directions: string | null
  onTrack: (type: TrackableEvent) => void
}) {
  const today = nowInZone(b.timeZone).day
  const website = safeUrl(b.website)
  return (
    <div className={styles.info}>
      <div className={styles.infoBlock}>
        {address && (
          <div className={styles.infoRow}>
            <MapPin aria-hidden />
            <div>
              <span className={styles.infoLabel}>Address</span>
              <address>{address}</address>
              {directions && (
                <a href={directions} target="_blank" rel="noopener noreferrer" className={styles.infoLink} onClick={() => onTrack('DirectionsClick')}>
                  Get directions <ExternalLink aria-hidden />
                </a>
              )}
            </div>
          </div>
        )}
        {(b.phone || b.whatsApp || b.email || website) && (
          <div className={styles.infoRow}>
            <Phone aria-hidden />
            <div>
              <span className={styles.infoLabel}>Contact</span>
              {b.phone && (
                <a href={telHref(b.phone)} className={styles.infoLink} onClick={() => onTrack('CallClick')}>
                  {b.phone}
                </a>
              )}
              {b.whatsApp && (
                <a href={whatsAppUrl(b.whatsApp)} target="_blank" rel="noopener noreferrer" className={styles.infoLink} onClick={() => onTrack('WhatsAppClick')}>
                  WhatsApp {b.whatsApp}
                </a>
              )}
              {b.email && (
                <a href={mailHref(b.email)} className={styles.infoLink}>
                  {b.email}
                </a>
              )}
              {website && (
                <a href={website} target="_blank" rel="noopener noreferrer" className={styles.infoLink} onClick={() => onTrack('WebsiteClick')}>
                  {displayUrl(website)}
                </a>
              )}
            </div>
          </div>
        )}
        {(b.paymentMethods.length > 0 || b.deliveryAvailable || b.pickupAvailable) && (
          <div className={styles.infoRow}>
            <CreditCard aria-hidden />
            <div>
              <span className={styles.infoLabel}>Payments & ordering</span>
              <div className={styles.tagList}>
                {b.paymentMethods.map((m) => (
                  <span key={m}>{paymentLabel(m)}</span>
                ))}
                {b.deliveryAvailable && <span className={styles.tagGold}>Delivery available</span>}
                {b.pickupAvailable && <span className={styles.tagGold}>Store pickup</span>}
              </div>
            </div>
          </div>
        )}
        {b.socialLinks.length > 0 && (
          <div className={styles.infoRow}>
            <Globe aria-hidden />
            <div>
              <span className={styles.infoLabel}>Follow us</span>
              <div className={styles.tagList}>
                {b.socialLinks.map((l) => {
                  const href = safeUrl(l.url)
                  return href ? (
                    <a key={l.url} href={href} target="_blank" rel="noopener noreferrer">
                      {l.label || l.platform}
                    </a>
                  ) : null
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {b.workingHours.length > 0 && (
        <div className={styles.infoBlock}>
          <div className={styles.infoRow}>
            <Clock aria-hidden />
            <div style={{ flex: 1 }}>
              <span className={styles.infoLabel}>Opening hours</span>
              <table className={styles.hours}>
                <tbody>
                  {DAYS.map((day) => {
                    const h = b.workingHours.find((w) => w.day === day)
                    return (
                      <tr key={day} className={day === today ? styles.today : undefined} aria-current={day === today ? 'date' : undefined}>
                        <th scope="row">{day}</th>
                        <td>{!h || h.isClosed || !h.opens ? 'Closed' : `${h.opens} – ${h.closes}`}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {b.upcomingSpecialHours.length > 0 && (
                <div className={styles.special}>
                  <span className={styles.infoLabel}>Special dates</span>
                  <ul>
                    {b.upcomingSpecialHours.map((s) => (
                      <li key={s.date}>
                        <strong>{formatDate(s.date)}</strong> — {s.isClosed ? 'Closed' : `${s.opens} – ${s.closes}`}
                        {s.note && ` · ${s.note}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
