import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Link2,
  Megaphone,
  PlayCircle,
  Rocket,
  Sparkles,
  Users,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Feedback'
import { useAuth } from '../../context/AuthContext'
import { TemplateThumbnail, templates } from '../../templates'
import { aboutTeaser, features, hero, qrDemo, steps } from '../../content/siteContent'
import { sampleModes, sampleOwner } from '../../content/sampleProfile'
import { initials } from '../../lib/format'
import type { ModeType } from '../../types/api'
import { CtaBanner, DecorativeQr, FeatureIcon, FounderCard, PlanGrid, SectionHeading } from './shared'
import styles from './Marketing.module.scss'

const modeIcons: Partial<Record<ModeType, typeof Code2>> = {
  Developer: Code2,
  HR: Users,
  Entrepreneur: Rocket,
  Marketing: Megaphone,
}

const roleChips = [
  { label: 'Developer', icon: Code2 },
  { label: 'HR Manager', icon: Users },
  { label: 'Entrepreneur', icon: Briefcase },
  { label: 'Marketer', icon: Megaphone },
]

function Hero() {
  const { status } = useAuth()
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.heroCopy}>
        <span className={styles.pill}>
          <Sparkles /> {hero.pill}
        </span>
        <h1 id="hero-title">
          {hero.titleStart} <span className={styles.gradientText}>{hero.titleEnd}</span>
        </h1>
        <p>{hero.subtitle}</p>
        <div className={styles.heroActions}>
          <Button to={status === 'authenticated' ? '/dashboard' : '/register'} size="lg" iconRight={<ArrowRight />}>
            {status === 'authenticated' ? 'Open Dashboard' : 'Get Started Free'}
          </Button>
          <Button href="#how-it-works" variant="secondary" size="lg" icon={<PlayCircle />}>
            See How It Works
          </Button>
        </div>
        <div className={styles.heroStats}>
          <div>
            <strong>1</strong>
            <span>Permanent QR code</span>
          </div>
          <div>
            <strong>10</strong>
            <span>Resume templates</span>
          </div>
          <div>
            <strong>∞</strong>
            <span>Ways to be you</span>
          </div>
        </div>
      </div>

      <div className={`${styles.heroVisual} ${styles.heroVisualMobile}`} aria-hidden>
        <div className={`${styles.stackCard} ${styles.stackBack1}`} />
        <div className={`${styles.stackCard} ${styles.stackBack2}`} />
        <div className={styles.profileCard}>
          <div className={styles.avatar}>{initials(sampleOwner.fullName)}</div>
          <h3>{sampleOwner.fullName}</h3>
          <p>Software Developer</p>
          <div className={styles.heroQr}>
            <DecorativeQr size={110} />
          </div>
        </div>
        <div className={styles.roleChips}>
          {roleChips.map(({ label, icon: Icon }) => (
            <div key={label} className={styles.roleChip}>
              <span>
                <Icon />
              </span>
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Highlights() {
  return (
    <div className={styles.highlights}>
      <div className={styles.highlightGrid}>
        {features.slice(0, 4).map((f) => (
          <div key={f.title}>
            <FeatureIcon icon={f.icon} />
            <h3>{f.title}</h3>
            <p>{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function AboutTeaser() {
  return (
    <section className={styles.section} id="about" aria-labelledby="about-title">
      <div className={styles.twoCol}>
        <div className={styles.prose}>
          <SectionHeading id="about-title" eyebrow={aboutTeaser.eyebrow} title={aboutTeaser.title} align="left" />
          {aboutTeaser.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <div style={{ marginTop: 24 }}>
            <Button to="/about" variant="secondary" iconRight={<ArrowRight />}>
              Learn more about us
            </Button>
          </div>
        </div>
        <div className={styles.statGrid}>
          <div>
            <strong>1 account</strong>
            <span>Every professional identity you need</span>
          </div>
          <div>
            <strong>1 QR</strong>
            <span>Never changes, never needs reprinting</span>
          </div>
          <div>
            <strong>10</strong>
            <span>Premium glassmorphism resume templates</span>
          </div>
          <div>
            <strong>0 apps</strong>
            <span>Viewers need nothing but a camera</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeaturesGrid() {
  return (
    <section className={styles.section} id="features" aria-labelledby="features-title">
      <SectionHeading
        id="features-title"
        eyebrow="Platform Features"
        title="Everything your digital identity needs"
        subtitle="Powerful tools for professionals, freelancers and business owners — designed to impress at first scan."
      />
      <div className={styles.featureGrid}>
        {features.map((f) => (
          <article key={f.title} className={styles.featureCard}>
            <FeatureIcon icon={f.icon} />
            <h3>{f.title}</h3>
            <p>{f.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section className={styles.section} id="how-it-works" aria-labelledby="how-title">
      <SectionHeading
        id="how-title"
        eyebrow="How It Works"
        title="Get your professional presence live in 3 steps"
      />
      <ol className={styles.steps} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {steps.map((s, i) => (
          <li key={s.title} className={styles.step}>
            <span className={styles.stepNumber}>{i + 1}</span>
            <h3>{s.title}</h3>
            <p>{s.description}</p>
            {i < steps.length - 1 && <ArrowRight className={styles.stepArrow} aria-hidden />}
          </li>
        ))}
      </ol>
    </section>
  )
}

function IdentityShowcase() {
  const [active, setActive] = useState(0)
  const mode = sampleModes[active]!
  return (
    <section className={styles.section} id="identities" aria-labelledby="identities-title">
      <SectionHeading
        id="identities-title"
        eyebrow="Multiple Professional Identities"
        title="One person. Many professional stories."
        subtitle="Each mode is a complete resume with its own skills, experience, projects and template."
      />
      <div className={styles.tabs} role="tablist" aria-label="Sample professional modes">
        {sampleModes.map((m, i) => {
          const Icon = modeIcons[m.modeType] ?? Briefcase
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              id={`mode-tab-${i}`}
              aria-selected={i === active}
              aria-controls="mode-panel"
              className={[styles.tab, i === active && styles.tabActive].filter(Boolean).join(' ')}
              onClick={() => setActive(i)}
            >
              <Icon /> {m.modeName}
            </button>
          )
        })}
      </div>
      <div className={styles.showcase} id="mode-panel" role="tabpanel" aria-labelledby={`mode-tab-${active}`}>
        <div className={styles.showcaseInfo} key={`info-${mode.id}`}>
          <Badge>Sample profile</Badge>
          <h3 style={{ marginTop: 12 }}>{sampleOwner.fullName}</h3>
          <p className={styles.designation}>
            {mode.designation}
            {mode.companyName ? ` · ${mode.companyName}` : ''}
          </p>
          <p>{mode.summary}</p>
          <div className={styles.tagList}>
            {mode.skills.slice(0, 6).map((s) => (
              <span key={s.name}>{s.name}</span>
            ))}
          </div>
          <ul className={styles.checkList}>
            <li>
              <Check size={16} /> {mode.workExperiences.length} experience entries
            </li>
            <li>
              <Check size={16} /> Template: {templates.find((t) => t.key === mode.templateKey)?.name}
            </li>
            <li>
              <Check size={16} /> Same QR code as every other mode
            </li>
          </ul>
        </div>
        <div className={styles.showcasePreview} key={`preview-${mode.id}`}>
          <TemplateThumbnail
            templateKey={mode.templateKey}
            fullName={sampleOwner.fullName}
            photoUrl={sampleOwner.photoUrl}
            permanentUrl={sampleOwner.permanentUrl}
            mode={mode}
            height={420}
          />
        </div>
      </div>
    </section>
  )
}

function QrDemo() {
  return (
    <section className={styles.section} id="qr" aria-labelledby="qr-title">
      <div className={styles.qrDemo}>
        <div>
          <SectionHeading
            id="qr-title"
            eyebrow={qrDemo.eyebrow}
            title={qrDemo.title}
            subtitle={qrDemo.body}
            align="left"
          />
          <ul className={styles.checkList} style={{ marginTop: -16 }}>
            {qrDemo.points.map((p) => (
              <li key={p}>
                <Check size={16} /> {p}
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.qrVisual}>
          <div className={styles.qrFrame}>
            <DecorativeQr size={200} />
          </div>
          <span className={styles.qrUrl}>
            <Link2 size={14} aria-hidden /> yourdomain.com/p/yourname
          </span>
          <div className={styles.modeFlow} aria-label="Modes reachable from one QR code">
            {sampleModes.map((m) => (
              <span key={m.id}>{m.modeName}</span>
            ))}
          </div>
          <span className={styles.qrCaption}>Illustration — your real QR code is generated in your dashboard.</span>
        </div>
      </div>
    </section>
  )
}

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
        title="Explore professional templates"
        subtitle="10 modern glassmorphism resume templates for every professional — choose a different one for each mode."
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

export default function HomePage() {
  return (
    <>
      <Hero />
      <Highlights />
      <AboutTeaser />
      <FeaturesGrid />
      <HowItWorks />
      <IdentityShowcase />
      <QrDemo />
      <TemplateCarousel />
      <section className={styles.section} id="pricing" aria-labelledby="pricing-title">
        <SectionHeading
          id="pricing-title"
          eyebrow="Pricing"
          title="Simple plans that grow with you"
          subtitle="Start free. Upgrade when you need more modes and premium templates."
        />
        <PlanGrid />
      </section>
      <section className={styles.section} id="founder" aria-labelledby="founder-title">
        <SectionHeading id="founder-title" eyebrow="Meet the Founder" title="The story behind the platform" />
        <FounderCard />
      </section>
      <CtaBanner
        title="Ready to Build Your Digital Identity?"
        subtitle="Join professionals, freelancers and business owners who share every side of their work with one QR code."
      />
    </>
  )
}
