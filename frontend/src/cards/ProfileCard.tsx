import { useState, type ReactNode } from 'react'
import {
  Award,
  BadgeCheck,
  Briefcase,
  Building2,
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  FolderKanban,
  Gem,
  Globe,
  GraduationCap,
  Home,
  Layers,
  Lightbulb,
  Mail,
  MapPin,
  Phone,
  Share2,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react'
import type { PublicMode } from '../types/api'
import { deriveResumeData } from '../templates/shared/useResumeData'
import { BrandIcon } from '../components/ui/BrandIcon'
import { assetUrl } from '../lib/url'
import { initials } from '../lib/format'
import { getCardTheme, type CardTheme } from './cardThemes'
import { iconFor } from './skillIcon'
import styles from './ProfileCard.module.scss'

export interface ProfileCardProps {
  fullName: string
  photoUrl: string | null
  permanentUrl: string
  mode: PublicMode
  /** Overrides mode.templateKey (gallery previews). */
  templateKey?: string
  /** Miniature rendering: no sticky bar, no animation. */
  compact?: boolean
  /** Opens the mode chooser (shown as the mode chip). */
  onChangeMode?: () => void
  onShare?: () => void
  /** vCard download URL for this mode. */
  vcardHref?: string
  onSaveContact?: () => void
  onInstall?: () => void
  showInstall?: boolean
  onViewResume?: () => void
}

interface QuickAction {
  key: string
  label: string
  href: string
  icon: ReactNode
  external?: boolean
}

function whatsappHref(mode: PublicMode, phone: string | null): string | undefined {
  const link = mode.socialLinks.find((l) => l.platform === 'WhatsApp')?.url
  if (link && /^https?:\/\//i.test(link)) return link
  const digits = phone?.replace(/[^\d]/g, '')
  return digits ? `https://wa.me/${digits}` : undefined
}

function yearsOfExperience(mode: PublicMode): number {
  const starts = mode.workExperiences.map((w) => w.startDate).filter((d): d is string => !!d)
  if (!starts.length) return 0
  const earliest = Math.min(...starts.map((d) => new Date(d).getTime()))
  return Math.max(0, Math.floor((Date.now() - earliest) / (365.25 * 24 * 3600 * 1000)))
}

/** Mobile-first digital profile card — the screen viewers land on after scanning the QR code. */
export function ProfileCard(props: ProfileCardProps) {
  const { fullName, permanentUrl, mode, compact } = props
  const theme = getCardTheme(props.templateKey ?? mode.templateKey)
  const d = deriveResumeData(mode, permanentUrl)
  const phone = mode.contact.phone
  const email = mode.contact.email
  const linkedIn = d.socialLinks.find((l) => l.platform === 'LinkedIn')

  const quick: QuickAction[] = []
  if (phone) quick.push({ key: 'phone', label: 'Call', href: `tel:${phone.replace(/[^\d+]/g, '')}`, icon: <Phone /> })
  if (email) quick.push({ key: 'email', label: 'Email', href: `mailto:${email}`, icon: <Mail /> })
  const wa = whatsappHref(mode, phone)
  if (wa) quick.push({ key: 'whatsapp', label: 'WhatsApp', href: wa, icon: <BrandIcon platform="WhatsApp" size={20} />, external: true })
  if (linkedIn) quick.push({ key: 'linkedin', label: 'LinkedIn', href: linkedIn.href, icon: <BrandIcon platform="LinkedIn" size={19} />, external: true })
  else if (mode.contact.location)
    quick.push({
      key: 'location',
      label: 'Location',
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mode.contact.location)}`,
      icon: <MapPin />,
      external: true,
    })

  // Neon Tech shows the first skills as chips above the stats, so the section lists the rest.
  const sectionSkills = theme.stats ? mode.skills.slice(4) : mode.skills
  const years = yearsOfExperience(mode)
  const stats = [
    years > 0 && { value: `${years}+`, label: 'Years Exp.' },
    mode.projects.length > 0 && { value: String(mode.projects.length), label: 'Projects' },
    mode.skills.length > 0 && { value: String(mode.skills.length), label: 'Skills' },
    mode.certifications.length > 0 && { value: String(mode.certifications.length), label: 'Certifications' },
  ].filter(Boolean).slice(0, 3) as { value: string; label: string }[]

  const businessHighlights = [
    mode.businessName && `${mode.businessName}${mode.industry ? ` — ${mode.industry}` : ''}`,
    !mode.businessName && mode.industry && `Industry: ${mode.industry}`,
  ].filter(Boolean) as string[]

  return (
    <article
      className={[styles.card, styles[`t_${theme.key.replace(/-/g, '_')}`], compact && styles.compact].filter(Boolean).join(' ')}
      data-card={theme.key}
      aria-label={`${fullName} – ${mode.modeName}`}
    >
      <Hero {...props} theme={theme} d={d} />

      {theme.hero !== 'classic' && theme.hero !== 'split' && quick.length > 0 && (
        <nav className={styles.quick} aria-label="Quick contact">
          {quick.map((q) => (
            <a key={q.key} href={q.href} className={styles.quickBtn} aria-label={q.label} title={q.label}
              {...(q.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              {q.icon}
            </a>
          ))}
        </nav>
      )}

      {theme.hero === 'classic' && (mode.contact.phone || mode.contact.email || mode.contact.location) && (
        <div className={styles.contactTiles}>
          {phone && (
            <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className={styles.contactTile}>
              <Phone /> <span>{phone}</span>
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className={styles.contactTile}>
              <Mail /> <span>{email}</span>
            </a>
          )}
          {mode.contact.location && (
            <span className={styles.contactTile}>
              <MapPin /> <span>{mode.contact.location}</span>
            </span>
          )}
        </div>
      )}

      {theme.stats && stats.length > 0 && (
        <div className={styles.stats}>
          {theme.key === 'neon-tech' && mode.skills.length > 0 && (
            <div className={styles.statChips}>
              {mode.skills.slice(0, 4).map((s) => (
                <span key={s.name}>{s.name}</span>
              ))}
            </div>
          )}
          <div className={styles.statRow}>
            {stats.map((s) => (
              <div key={s.label} className={styles.stat}>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.body}>
        {d.summary && (
          <Section icon={<UserRound />} title="About">
            <p className={styles.text}>{d.summary}</p>
          </Section>
        )}

        {(businessHighlights.length > 0 || d.businessDescription) && (
          <Section icon={<BadgeCheck />} title="Business Highlights">
            <ul className={styles.bullets}>
              {businessHighlights.map((b) => (
                <li key={b}>{b}</li>
              ))}
              {d.businessDescription && <li>{d.businessDescription}</li>}
            </ul>
          </Section>
        )}

        {sectionSkills.length > 0 && (
          <Section icon={<Lightbulb />} title={mode.modeType === 'Entrepreneur' ? 'Expertise' : theme.skills === 'tiles' ? 'Skills' : 'Key Skills'}>
            {theme.skills === 'tiles' ? (
              <div className={styles.tiles}>
                {sectionSkills.slice(0, 8).map((s) => {
                  const Icon = iconFor(s.name, s.category)
                  return (
                    <div key={`${s.category}-${s.name}`} className={styles.tile}>
                      <Icon />
                      <span>{s.name}</span>
                    </div>
                  )
                })}
              </div>
            ) : null}
            {(theme.skills === 'chips' || sectionSkills.length > 8) && (
              <div className={styles.chips}>
                {(theme.skills === 'tiles' ? sectionSkills.slice(8) : sectionSkills).map((s) => (
                  <span key={`${s.category}-${s.name}`} className={styles.chip}>
                    {s.name}
                  </span>
                ))}
              </div>
            )}
          </Section>
        )}

        {mode.services.length > 0 && (
          <Section icon={<Layers />} title={mode.modeType === 'Entrepreneur' ? 'Products & Services' : 'Services'}>
            {theme.serviceTiles ? (
              <div className={styles.tiles}>
                {mode.services.map((s) => {
                  const Icon = iconFor(s.name)
                  return (
                    <div key={s.name} className={styles.tile} title={s.description ?? undefined}>
                      <Icon />
                      <span>{s.name}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <ul className={styles.bullets}>
                {mode.services.map((s) => (
                  <li key={s.name}>
                    <strong>{s.name}</strong>
                    {s.description && <> — {s.description}</>}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {d.experiences.length > 0 && (
          <Section icon={<Briefcase />} title="Experience">
            <ul className={styles.timeline}>
              {d.experiences.map((w, i) => (
                <li key={i}>
                  <strong>
                    {w.title} – {w.company}
                  </strong>
                  {w.dateRange && <span className={styles.meta}>{w.dateRange}</span>}
                  {w.bullets.length > 0 && (
                    <ul className={styles.subBullets}>
                      {w.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {d.projects.length > 0 && (
          <Section icon={<FolderKanban />} title={theme.key === 'neon-tech' ? 'Featured Project' : theme.key === 'creative-portfolio' ? 'Portfolio' : 'Key Projects'}>
            {theme.key === 'creative-portfolio' ? (
              <div className={styles.portfolio}>
                {d.projects.map((p, i) => (
                  <ProjectLink key={i} href={p.href} className={styles.portfolioItem}>
                    <span className={styles.portfolioArt} data-i={i % 3} aria-hidden>
                      <FolderKanban />
                    </span>
                    <strong>{p.title}</strong>
                    {p.outcome && <span className={styles.meta}>{p.outcome}</span>}
                  </ProjectLink>
                ))}
              </div>
            ) : theme.key === 'neon-tech' || theme.key === 'modern-glass' || theme.key === 'premium-dark' ? (
              <div className={styles.projectCards}>
                {d.projects.map((p, i) => (
                  <ProjectLink key={i} href={p.href} className={styles.projectCard}>
                    <span className={styles.projectIcon} aria-hidden>
                      <FolderKanban />
                    </span>
                    <span className={styles.projectText}>
                      <strong>{p.title}</strong>
                      {(p.description || p.role) && <span>{p.description ?? p.role}</span>}
                      {p.outcome && <em>{p.outcome}</em>}
                    </span>
                    {p.href && <ExternalLink className={styles.projectExt} />}
                  </ProjectLink>
                ))}
              </div>
            ) : (
              <ul className={styles.inlineList}>
                {d.projects.map((p, i) => (
                  <li key={i}>
                    <ProjectLink href={p.href}>{p.title}</ProjectLink>
                    {p.outcome && <span className={styles.meta}> — {p.outcome}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {d.achievements.length > 0 && (
          <Section icon={<Trophy />} title={theme.key === 'elegant-white' ? 'Client Impact' : 'Key Achievements'}>
            <ul className={styles.bullets}>
              {d.achievements.map((a, i) => (
                <li key={i}>
                  {a.title}
                  {a.description && <span className={styles.meta}> — {a.description}</span>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {d.educations.length > 0 && (
          <Section icon={<GraduationCap />} title="Education">
            <ul className={styles.plainList}>
              {d.educations.map((e, i) => (
                <li key={i}>
                  <strong>{e.degree}</strong>
                  <span className={styles.meta}>
                    {e.institution}
                    {e.years && ` · ${e.years}`}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {d.certifications.length > 0 && (
          <Section icon={<Award />} title="Certifications">
            <ul className={styles.plainList}>
              {d.certifications.map((c, i) => (
                <li key={i}>
                  <ProjectLink href={c.href}>
                    <strong>{c.name}</strong>
                  </ProjectLink>
                  {(c.issuer || c.dateLabel) && <span className={styles.meta}>{[c.issuer, c.dateLabel].filter(Boolean).join(' · ')}</span>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {d.customSections.map((c) => (
          <Section key={c.title} icon={<Gem />} title={c.title}>
            <p className={styles.text}>{c.content}</p>
          </Section>
        ))}

        {d.details.some((x) => x.href) && (
          <Section icon={<Globe />} title="Links">
            <ul className={styles.plainList}>
              {d.details
                .filter((x) => x.href)
                .map((x) => (
                  <li key={x.label}>
                    <span className={styles.meta}>{x.label}</span>
                    <a href={x.href} target="_blank" rel="noopener noreferrer" className={styles.link}>
                      {x.value}
                    </a>
                  </li>
                ))}
            </ul>
          </Section>
        )}

        {d.socialLinks.length > 0 && (
          <div className={styles.socials}>
            {d.socialLinks.map((l) => (
              <a key={l.platform} href={l.href} target="_blank" rel="noopener noreferrer" aria-label={l.label} title={l.label}>
                <BrandIcon platform={l.platform} size={18} />
              </a>
            ))}
          </div>
        )}

        {props.onViewResume && (
          <button type="button" className={styles.resumeBtn} onClick={props.onViewResume}>
            <FileText /> View full resume
          </button>
        )}
        {d.profileUrlLabel && <p className={styles.url}>{d.profileUrlLabel}</p>}
      </div>

      <div className={styles.actions}>
        <a
          className={styles.primaryAction}
          href={props.vcardHref ?? '#'}
          download={props.vcardHref ? true : undefined}
          onClick={(e) => {
            if (!props.vcardHref) e.preventDefault()
            props.onSaveContact?.()
          }}
        >
          <Download /> Save Contact
        </a>
        <button type="button" className={styles.secondaryAction} onClick={props.onShare}>
          <Share2 /> Share
        </button>
        {props.showInstall !== false && (
          <button type="button" className={styles.secondaryAction} onClick={props.onInstall}>
            <Home /> <span className={styles.twoLine}>Add to Home</span>
          </button>
        )}
      </div>
    </article>
  )
}

function Hero({
  fullName,
  photoUrl,
  mode,
  theme,
  d,
  onChangeMode,
  onShare,
}: ProfileCardProps & { theme: CardTheme; d: ReturnType<typeof deriveResumeData> }) {
  const [imgFailed, setImgFailed] = useState(false)
  const src = assetUrl(photoUrl)
  const avatar =
    src && !imgFailed ? (
      <img className={styles.avatar} src={src} alt={fullName} onError={() => setImgFailed(true)} referrerPolicy="no-referrer" />
    ) : (
      <span className={[styles.avatar, styles.avatarFallback].join(' ')} role="img" aria-label={fullName}>
        {initials(fullName) || '?'}
      </span>
    )

  const identity = (
    <div className={styles.identity}>
      <h1 className={styles.name}>{fullName}</h1>
      {(mode.designation || mode.modeName) && <p className={styles.designation}>{mode.designation ?? mode.modeName}</p>}
      {(mode.companyName || mode.businessName) && (
        <p className={styles.company}>
          <Building2 /> {mode.companyName ?? mode.businessName}
        </p>
      )}
    </div>
  )

  const topBar = (onChangeMode || onShare) && (
    <div className={styles.topBar}>
      {onChangeMode ? (
        <button type="button" className={styles.modeChip} onClick={onChangeMode} aria-label={`Change profile mode (current: ${mode.modeName})`}>
          <Sparkles /> {mode.modeName} <ChevronDown />
        </button>
      ) : (
        <span />
      )}
      {onShare && (
        <button type="button" className={styles.iconTop} onClick={onShare} aria-label="Share profile">
          <Share2 />
        </button>
      )}
    </div>
  )

  if (theme.hero === 'split') {
    return (
      <header className={styles.heroSplit}>
        {topBar}
        <div className={styles.splitPhoto}>{avatar}</div>
        <div className={styles.splitPanel}>
          {identity}
          <ul className={styles.splitContact}>
            {mode.contact.phone && (
              <li>
                <Phone /> <a href={`tel:${mode.contact.phone.replace(/[^\d+]/g, '')}`}>{mode.contact.phone}</a>
              </li>
            )}
            {mode.contact.email && (
              <li>
                <Mail /> <a href={`mailto:${mode.contact.email}`}>{mode.contact.email}</a>
              </li>
            )}
            {d.contact.find((c) => c.kind === 'website') && (
              <li>
                <Globe /> <span>{d.contact.find((c) => c.kind === 'website')!.value}</span>
              </li>
            )}
            {mode.contact.location && (
              <li>
                <MapPin /> <span>{mode.contact.location}</span>
              </li>
            )}
          </ul>
        </div>
      </header>
    )
  }

  if (theme.hero === 'classic') {
    return (
      <header className={styles.heroClassic}>
        {topBar}
        <div className={styles.classicRow}>
          {avatar}
          <div className={styles.classicName}>{identity}</div>
        </div>
      </header>
    )
  }

  return (
    <header className={[styles.hero, theme.hero === 'cover' && styles.heroCover, theme.hero === 'right' && styles.heroRight].filter(Boolean).join(' ')}>
      {theme.hero === 'cover' && <div className={styles.cover} aria-hidden />}
      {topBar}
      <div className={styles.heroRow}>
        <div className={styles.avatarRing}>{avatar}</div>
        {identity}
      </div>
    </header>
  )
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <span className={styles.sectionIcon}>{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function ProjectLink({ href, className, children }: { href?: string; className?: string; children: ReactNode }) {
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={[styles.link, className].filter(Boolean).join(' ')}>
      {children}
    </a>
  ) : (
    <span className={className}>{children}</span>
  )
}


