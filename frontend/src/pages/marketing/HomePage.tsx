import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Contact,
  Croissant,
  Download,
  Eye,
  Flower2,
  Footprints,
  Gem,
  MapPin,
  MessageCircle,
  MessageSquareText,
  MousePointerClick,
  Navigation,
  Phone,
  QrCode,
  Quote,
  ScanLine,
  Scissors,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Store,
  Tag,
  UserRound,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'
import { TemplateThumbnail, templates } from '../../templates'
import { features, hero } from '../../content/siteContent'
import {
  analyticsPoints,
  businessCategories,
  homeFaq,
  landingSteps,
  offerings,
  testimonialPlaceholders,
  type BusinessCategoryKey,
} from '../../content/landingContent'
import { sampleModes, sampleOwner } from '../../content/sampleProfile'
import { initials } from '../../lib/format'
import { CtaBanner, DecorativeQr, FeatureIcon, PlanGrid, SectionHeading } from './shared'
import { FaqList } from './FaqList'
import styles from './Marketing.module.scss'
import l from './Landing.module.scss'

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

function useStartTarget() {
  const { status } = useAuth()
  const authed = status === 'authenticated'
  return { authed, to: authed ? '/dashboard' : '/register' }
}

// Illustrative sample business used in visuals only (clearly labelled "Sample" wherever shown).
const sampleBusiness = {
  name: 'Bloom & Petal',
  category: 'Flower Shop',
  area: 'MG Road',
  offer: '10% off wedding orders',
  products: [
    { name: 'Rose Bouquet', tone: 'rose' },
    { name: 'Orchid Pot', tone: 'lilac' },
    { name: 'Sunflower Box', tone: 'sun' },
    { name: 'Table Décor', tone: 'leaf' },
  ],
}

// ---------------------------------------------------------------- Hero

function HeroVisual() {
  const personalMode = sampleModes[0]!
  return (
    <div className={l.heroVisual} aria-hidden>
      <div className={l.glow} />

      <div className={cx(l.miniCard, l.personalCard)}>
        <span className={l.cardKicker}>
          <UserRound /> Personal
        </span>
        <div className={l.personRow}>
          <div className={l.personAvatar}>{initials(sampleOwner.fullName)}</div>
          <div>
            <strong>{sampleOwner.fullName}</strong>
            <span>{personalMode.designation}</span>
          </div>
        </div>
        <div className={l.chipRow}>
          {sampleModes.slice(0, 3).map((m) => (
            <span key={m.id}>{m.modeName}</span>
          ))}
        </div>
        <div className={l.actionRow}>
          <span className={l.actionPrimary}>
            <Contact /> Save Contact
          </span>
          <span>
            <Download /> Resume
          </span>
        </div>
      </div>

      <div className={cx(l.miniCard, l.businessCard)}>
        <div className={l.storeBanner}>
          <span className={l.cardKicker}>
            <Store /> Business
          </span>
          <span className={l.openBadge}>
            <Clock /> Open now
          </span>
        </div>
        <div className={l.storeHead}>
          <div className={l.storeLogo}>
            <Flower2 />
          </div>
          <div>
            <strong>{sampleBusiness.name}</strong>
            <span>
              {sampleBusiness.category} · {sampleBusiness.area}
            </span>
          </div>
        </div>
        <div className={l.offerChip}>
          <Tag /> {sampleBusiness.offer}
        </div>
        <div className={l.productGrid}>
          {sampleBusiness.products.slice(0, 3).map((p) => (
            <div key={p.name} className={cx(l.productTile, l[`tone_${p.tone}`])}>
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={l.heroQrBadge}>
        <DecorativeQr size={84} />
        <span>
          <ScanLine /> One QR for both
        </span>
      </div>
    </div>
  )
}

function Hero() {
  const { authed, to } = useStartTarget()
  return (
    <section className={cx(styles.hero, l.hero)} aria-labelledby="hero-title">
      <div className={styles.heroCopy}>
        <span className={styles.pill}>
          <Sparkles /> {hero.pill}
        </span>
        <h1 id="hero-title">
          {hero.titleStart} <span className={cx(styles.gradientText, l.titleLine)}>{hero.titleEnd}</span>
        </h1>
        <p>{hero.subtitle}</p>
        <ul className={l.heroPoints}>
          <li>
            <span>
              <UserRound />
            </span>
            {hero.personalPoint}
          </li>
          <li>
            <span>
              <Store />
            </span>
            {hero.businessPoint}
          </li>
        </ul>
        <div className={styles.heroActions}>
          <Button to={to} size="lg" iconRight={<ArrowRight />}>
            {authed ? 'Open Dashboard' : 'Get Started'}
          </Button>
          <Button href="#features" variant="outline" size="lg" icon={<Sparkles />}>
            Explore Features
          </Button>
        </div>
      </div>
      <HeroVisual />
    </section>
  )
}

// ---------------------------------------------------------------- Core features

function CoreFeatures() {
  return (
    <section className={styles.section} id="features" aria-labelledby="features-title">
      <SectionHeading
        id="features-title"
        eyebrow="Core Features"
        title="Everything you need to be found and remembered"
        subtitle="The essentials behind every personal and business profile."
      />
      <div className={l.coreGrid}>
        {features.slice(0, 4).map((f) => (
          <article key={f.title} className={cx(styles.featureCard, l.coreCard)}>
            <FeatureIcon icon={f.icon} />
            <h3>{f.title}</h3>
            <p>{f.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- Personal vs business

function OfferingCard({
  kind,
  icon: Icon,
  data,
  cta,
}: {
  kind: 'personal' | 'business'
  icon: LucideIcon
  data: (typeof offerings)['personal']
  cta: ReactNode
}) {
  const titleId = `offering-${kind}`
  return (
    <article className={cx(l.offering, kind === 'business' && l.offeringBusiness)} aria-labelledby={titleId}>
      <div className={l.offeringHead}>
        <span className={l.offeringIcon}>
          <Icon />
        </span>
        <div>
          <h3 id={titleId}>{data.title}</h3>
          <span className={l.offeringTagline}>{data.tagline}</span>
        </div>
      </div>
      <p className={l.offeringDesc}>{data.description}</p>
      <ul className={styles.checkList}>
        {data.points.map((p) => (
          <li key={p}>
            <Check size={16} /> {p}
          </li>
        ))}
      </ul>
      <div className={l.offeringCta}>{cta}</div>
    </article>
  )
}

function PersonalVsBusiness() {
  const { to } = useStartTarget()
  return (
    <section className={styles.section} id="solutions" aria-labelledby="solutions-title">
      <SectionHeading
        id="solutions-title"
        eyebrow="Two Experiences, One Platform"
        title="Built for individuals and the businesses they run"
        subtitle="Choose a personal profile, a business profile, or use both under the same account."
      />
      <div className={l.offeringGrid}>
        <OfferingCard
          kind="personal"
          icon={UserRound}
          data={offerings.personal}
          cta={
            <Button to={to} variant="outline" iconRight={<ArrowRight />}>
              Create personal profile
            </Button>
          }
        />
        <OfferingCard
          kind="business"
          icon={BriefcaseBusiness}
          data={offerings.business}
          cta={
            <Button to={to} iconRight={<ArrowRight />}>
              Create business profile
            </Button>
          }
        />
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- Categories

const categoryIcons: Record<BusinessCategoryKey, LucideIcon> = {
  footwear: Footprints,
  flowers: Flower2,
  clothing: Shirt,
  restaurants: UtensilsCrossed,
  jewellery: Gem,
  beauty: Scissors,
  electronics: Smartphone,
  bakeries: Croissant,
  grocery: ShoppingBasket,
  other: Store,
}

function BusinessCategories() {
  return (
    <section className={styles.section} id="categories" aria-labelledby="categories-title">
      <SectionHeading
        id="categories-title"
        eyebrow="Business Categories"
        title="A storefront that fits your trade"
        subtitle="Category-aware profiles help each business show exactly what its customers look for."
      />
      <ul className={l.categoryGrid}>
        {businessCategories.map((c) => {
          const Icon = categoryIcons[c.key]
          return (
            <li key={c.key} className={l.category}>
              <span className={l.categoryIcon}>
                <Icon aria-hidden />
              </span>
              <strong>{c.name}</strong>
              <span>{c.blurb}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ---------------------------------------------------------------- How it works

const stepIcons: LucideIcon[] = [UserRound, QrCode, ScanLine]

function HowItWorks() {
  return (
    <section className={styles.section} id="how-it-works" aria-labelledby="how-title">
      <SectionHeading id="how-title" eyebrow="How It Works" title="Live in three simple steps" />
      <ol className={l.steps}>
        {landingSteps.map((s, i) => {
          const Icon = stepIcons[i] ?? Check
          return (
            <li key={s.title} className={l.step}>
              <div className={l.stepTop}>
                <span className={l.stepIcon}>
                  <Icon aria-hidden />
                </span>
                <span className={l.stepNum} aria-hidden>
                  0{i + 1}
                </span>
              </div>
              <h3>
                <span className="sr-only">Step {i + 1}: </span>
                {s.title}
              </h3>
              <p>{s.description}</p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

// ---------------------------------------------------------------- Live QR experience

function PhonePersonal() {
  const mode = sampleModes[0]!
  return (
    <div className={l.screen}>
      <div className={l.screenHero}>
        <div className={l.screenAvatar}>{initials(sampleOwner.fullName)}</div>
        <strong>{sampleOwner.fullName}</strong>
        <span>
          {mode.designation}
          {mode.companyName ? ` · ${mode.companyName}` : ''}
        </span>
      </div>
      <div className={l.screenChips}>
        {sampleModes.map((m, i) => (
          <span key={m.id} className={i === 0 ? l.screenChipActive : undefined}>
            {m.modeName}
          </span>
        ))}
      </div>
      <div className={l.screenSkills}>
        {mode.skills.slice(0, 5).map((s) => (
          <span key={s.name}>{s.name}</span>
        ))}
      </div>
      <div className={l.screenActions}>
        <span className={l.screenPrimary}>
          <Contact /> Save Contact
        </span>
        <span>
          <Smartphone /> Add to Home
        </span>
      </div>
    </div>
  )
}

function PhoneBusiness() {
  return (
    <div className={l.screen}>
      <div className={cx(l.screenHero, l.screenHeroBusiness)}>
        <div className={l.screenLogo}>
          <Flower2 />
        </div>
        <strong>{sampleBusiness.name}</strong>
        <span>
          {sampleBusiness.category} · <MapPin /> {sampleBusiness.area}
        </span>
      </div>
      <div className={l.offerChip}>
        <Tag /> {sampleBusiness.offer}
      </div>
      <div className={l.screenProducts}>
        {sampleBusiness.products.map((p) => (
          <div key={p.name} className={cx(l.productTile, l[`tone_${p.tone}`])}>
            <span>{p.name}</span>
          </div>
        ))}
      </div>
      <div className={l.screenActionsGrid}>
        <span>
          <Phone /> Call
        </span>
        <span>
          <MessageCircle /> WhatsApp
        </span>
        <span>
          <Navigation /> Directions
        </span>
      </div>
      <span className={cx(l.screenPrimary, l.screenEnquire)}>
        <MessageSquareText /> Send enquiry
      </span>
    </div>
  )
}

function LiveQrExperience() {
  const [view, setView] = useState<'personal' | 'business'>('personal')
  const baseId = useId()
  const tabs = [
    { key: 'personal' as const, label: 'Personal profile', icon: UserRound },
    { key: 'business' as const, label: 'Business profile', icon: Store },
  ]
  return (
    <section className={styles.section} id="live-demo" aria-labelledby="live-title">
      <SectionHeading
        id="live-title"
        eyebrow="Live QR Experience"
        title="Scan. Open. Connect."
        subtitle="Here’s what people see the moment they point their camera at your QR code."
      />
      <div className={l.liveTabs} role="tablist" aria-label="Choose a profile type to preview">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`${baseId}-tab-${key}`}
            aria-selected={view === key}
            aria-controls={`${baseId}-panel`}
            className={cx(l.liveTab, view === key && l.liveTabActive)}
            onClick={() => setView(key)}
          >
            <Icon aria-hidden /> {label}
          </button>
        ))}
      </div>

      <div className={l.liveStage}>
        <div className={l.scanCard} aria-hidden>
          <div className={l.scanFrame}>
            <DecorativeQr size={150} />
            <span className={l.scanLine} />
          </div>
          <span className={l.scanLabel}>
            <ScanLine /> Point any phone camera
          </span>
        </div>

        <div className={l.flowArrow} aria-hidden>
          <ArrowRight />
        </div>

        <div
          className={l.phone}
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${view}`}
        >
          <div className={l.phoneNotch} aria-hidden />
          <div className={l.phoneUrl} aria-hidden>
            yourdomain.com/p/{view === 'personal' ? 'arjunmehra' : 'bloomandpetal'}
          </div>
          <div key={view} className={l.phoneBody}>
            {view === 'personal' ? <PhonePersonal /> : <PhoneBusiness />}
          </div>
        </div>
      </div>
      <p className={l.illustrationNote}>Sample profiles for illustration. Your real QR code is generated in your dashboard.</p>
    </section>
  )
}

// ---------------------------------------------------------------- Templates (existing carousel)

function TemplateCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const cardWidth = () => {
    const track = trackRef.current
    const first = track?.firstElementChild as HTMLElement | null
    return first ? first.offsetWidth + 18 : 1
  }

  const onScroll = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    setIndex(Math.min(templates.length - 1, Math.round(track.scrollLeft / cardWidth())))
  }, [])

  useEffect(() => {
    const track = trackRef.current
    track?.addEventListener('scroll', onScroll, { passive: true })
    return () => track?.removeEventListener('scroll', onScroll)
  }, [onScroll])

  const scrollTo = (i: number) => {
    const clamped = Math.max(0, Math.min(templates.length - 1, i))
    trackRef.current?.scrollTo({ left: clamped * cardWidth(), behavior: 'smooth' })
    setIndex(clamped)
  }

  return (
    <section className={styles.section} id="templates" aria-labelledby="templates-title">
      <SectionHeading
        id="templates-title"
        eyebrow="Profile Templates"
        title="Premium templates for personal profiles"
        subtitle="Modern glassmorphism resume templates — choose a different look for each professional mode."
      />
      <div className={styles.carousel}>
        <button
          type="button"
          className={`${styles.carouselNav} ${styles.prev}`}
          onClick={() => scrollTo(index - 1)}
          disabled={index === 0}
          aria-label="Previous templates"
        >
          <ChevronLeft />
        </button>
        <div className={styles.carouselTrack} ref={trackRef}>
          {templates.map((t, i) => {
            const mode = { ...sampleModes[i % sampleModes.length]!, templateKey: t.key }
            return (
              <figure key={t.key} className={styles.templateCard} style={{ margin: 0 }}>
                <div className={styles.templateFrame}>
                  <TemplateThumbnail
                    templateKey={t.key}
                    fullName={sampleOwner.fullName}
                    photoUrl={sampleOwner.photoUrl}
                    permanentUrl={sampleOwner.permanentUrl}
                    mode={mode}
                    height={300}
                  />
                </div>
                <figcaption className={styles.templateName}>{t.name}</figcaption>
              </figure>
            )
          })}
        </div>
        <button
          type="button"
          className={`${styles.carouselNav} ${styles.next}`}
          onClick={() => scrollTo(index + 1)}
          disabled={index >= templates.length - 1}
          aria-label="Next templates"
        >
          <ChevronRight />
        </button>
      </div>
      <div className={styles.dots}>
        {templates.map((t, i) => (
          <button
            key={t.key}
            type="button"
            className={i === index ? styles.dotActive : undefined}
            onClick={() => scrollTo(i)}
            aria-label={`Show ${t.name} template`}
            aria-current={i === index}
          />
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- Analytics preview

// Illustrative values only — the preview is labelled as sample data.
const sampleWeek = [
  { day: 'Mon', scans: 38, visits: 52 },
  { day: 'Tue', scans: 45, visits: 61 },
  { day: 'Wed', scans: 32, visits: 47 },
  { day: 'Thu', scans: 58, visits: 74 },
  { day: 'Fri', scans: 66, visits: 88 },
  { day: 'Sat', scans: 84, visits: 112 },
  { day: 'Sun', scans: 71, visits: 96 },
]
const sampleActions = [
  { label: 'WhatsApp', icon: MessageCircle, value: 64 },
  { label: 'Directions', icon: Navigation, value: 48 },
  { label: 'Calls', icon: Phone, value: 31 },
  { label: 'Enquiries', icon: MessageSquareText, value: 18 },
]

function AnalyticsPreview() {
  const max = Math.max(...sampleWeek.map((d) => d.visits))
  const totalScans = sampleWeek.reduce((a, d) => a + d.scans, 0)
  const totalVisits = sampleWeek.reduce((a, d) => a + d.visits, 0)
  const totalActions = sampleActions.reduce((a, d) => a + d.value, 0)
  const actionMax = Math.max(...sampleActions.map((a) => a.value))
  const pointIcons = [ScanLine, Eye, MousePointerClick]

  return (
    <section className={styles.section} id="analytics" aria-labelledby="analytics-title">
      <div className={l.analytics}>
        <div className={l.analyticsCopy}>
          <SectionHeading
            id="analytics-title"
            eyebrow="Analytics"
            title="See what your QR code is doing for you"
            subtitle="Understand how people find and interact with your profile — without compromising their privacy."
            align="left"
          />
          <ul className={l.analyticsPoints}>
            {analyticsPoints.map((p, i) => {
              const Icon = pointIcons[i] ?? Check
              return (
                <li key={p.title}>
                  <span>
                    <Icon aria-hidden />
                  </span>
                  <div>
                    <strong>{p.title}</strong>
                    <p>{p.description}</p>
                  </div>
                </li>
              )
            })}
          </ul>
          <p className={l.privacyNote}>No visitor IP addresses are stored.</p>
        </div>

        <figure className={l.dash} aria-labelledby="analytics-caption">
          <div className={l.dashHead}>
            <strong>Last 7 days</strong>
            <span className={l.sampleBadge}>Sample data</span>
          </div>
          <div className={l.kpis}>
            <div>
              <span>QR scans</span>
              <strong className={l.kpiGold}>{totalScans}</strong>
            </div>
            <div>
              <span>Profile visits</span>
              <strong>{totalVisits}</strong>
            </div>
            <div>
              <span>Actions</span>
              <strong>{totalActions}</strong>
            </div>
          </div>
          <div className={l.chart} aria-hidden>
            {sampleWeek.map((d) => (
              <div key={d.day} className={l.chartCol}>
                <div className={l.chartBars}>
                  <span className={l.barVisits} style={{ height: `${(d.visits / max) * 100}%` }} />
                  <span className={l.barScans} style={{ height: `${(d.scans / max) * 100}%` }} />
                </div>
                <span className={l.chartDay}>{d.day}</span>
              </div>
            ))}
          </div>
          <div className={l.legend} aria-hidden>
            <span>
              <i className={l.legendVisits} /> Profile visits
            </span>
            <span>
              <i className={l.legendScans} /> QR scans
            </span>
          </div>
          <ul className={l.actionList}>
            {sampleActions.map(({ label, icon: Icon, value }) => (
              <li key={label}>
                <Icon aria-hidden />
                <span>{label}</span>
                <span className={l.actionTrack}>
                  <span style={{ width: `${(value / actionMax) * 100}%` }} />
                </span>
                <strong>{value}</strong>
              </li>
            ))}
          </ul>
          <figcaption id="analytics-caption" className="sr-only">
            Illustrative analytics dashboard with sample numbers showing weekly QR scans, profile visits and visitor
            actions.
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- Pricing

function Pricing() {
  return (
    <section className={styles.section} id="pricing" aria-labelledby="pricing-title">
      <SectionHeading
        id="pricing-title"
        eyebrow="Pricing"
        title="Simple plans that grow with you"
        subtitle="Start free. Upgrade when you need more profiles and premium templates. Your QR code never changes."
      />
      <PlanGrid comparison />
    </section>
  )
}

// ---------------------------------------------------------------- Testimonials (placeholders)

function Testimonials() {
  return (
    <section className={styles.section} id="testimonials" aria-labelledby="testimonials-title">
      <SectionHeading
        id="testimonials-title"
        eyebrow="Testimonials"
        title="Stories from our community"
        subtitle="Real reviews from people and businesses using the platform will appear here."
      />
      <ul className={l.testimonials}>
        {testimonialPlaceholders.map((t, i) => (
          <li key={i} className={l.testimonial}>
            <div className={l.testimonialTop}>
              <Quote aria-hidden />
              <span className={l.placeholderBadge}>Placeholder</span>
            </div>
            <p>Customer review coming soon. This space is reserved for a genuine, verified review.</p>
            <div className={l.testimonialFoot}>
              <span className={l.testimonialAvatar} aria-hidden>
                {t.audience.startsWith('Business') ? <Store /> : <UserRound />}
              </span>
              <div>
                <strong>{t.role}</strong>
                <span>{t.audience}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ---------------------------------------------------------------- FAQ

function Faq() {
  return (
    <section className={cx(styles.section, styles.narrow)} id="faq" aria-labelledby="faq-title">
      <SectionHeading id="faq-title" eyebrow="FAQ" title="Frequently asked questions" />
      <FaqList items={homeFaq} />
    </section>
  )
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <CoreFeatures />
      <PersonalVsBusiness />
      <BusinessCategories />
      <HowItWorks />
      <LiveQrExperience />
      <TemplateCarousel />
      <AnalyticsPreview />
      <Pricing />
      <Testimonials />
      <Faq />
      <CtaBanner
        title="Create your digital identity today"
        subtitle="Launch a personal profile, a business storefront, or both — and share everything with one permanent QR code."
        secondary={{ label: 'View pricing', to: '/pricing' }}
      />
    </>
  )
}
