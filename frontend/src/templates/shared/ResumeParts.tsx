import { useId, type ReactNode } from 'react'
import {
  Award,
  BadgeCheck,
  Briefcase,
  Building2,
  ExternalLink,
  FileText,
  FolderKanban,
  Globe,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  UserRound,
  Wrench,
} from 'lucide-react'
import { BrandIcon } from '../../components/ui/BrandIcon'
import { assetUrl } from '../../lib/url'
import { initials } from '../../lib/format'
import type { ContactKind, ResumeData } from './useResumeData'

/**
 * Headless resume building blocks. Each component renders semantic markup using a
 * conventional set of class "slots" looked up on the template's own CSS module (`s`),
 * so every template fully controls the look while sharing the logic.
 *
 * Slots: section, sectionTitle, sectionIcon, summary, tagGroups, tagGroup, tagGroupTitle, tagList, tag,
 * barList, bar, barLabel, barTrack, barFill, timeline, timelineItem, timelineDot, timelineHeader,
 * timelineTitle, timelineCompany, timelineMeta, timelineText, bullets, projectGrid, projectCard,
 * projectTitle, projectRole, projectText, projectOutcome, projectTech, projectTechTag, projectLink,
 * eduList, eduItem, eduDegree, eduInstitution, eduMeta, eduText, certList, certItem, certName,
 * certMeta, certLink, achList, achItem, achTitle, achMeta, achText, serviceGrid, serviceCard,
 * serviceName, serviceText, customText, contactList, contactItem, contactIcon, contactValue,
 * socialList, socialLink, socialLabel, avatar, avatarFallback, detailList, detailItem, detailLabel,
 * detailValue, profileUrl
 */
export type Slots = Readonly<Record<string, string>>

export const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ') || undefined

interface SectionProps {
  s: Slots
  title: string
  icon?: ReactNode
  showIcon?: boolean
  className?: string
  children: ReactNode
}

export function Section({ s, title, icon, showIcon = true, className, children }: SectionProps) {
  const id = useId()
  return (
    <section className={cx(s.section, className)} aria-labelledby={id}>
      <h2 id={id} className={s.sectionTitle}>
        {showIcon && icon && <span className={s.sectionIcon}>{icon}</span>}
        <span>{title}</span>
      </h2>
      {children}
    </section>
  )
}

type PartProps = { s: Slots; data: ResumeData; title?: string; showIcon?: boolean; className?: string }

export function Avatar({
  s,
  photoUrl,
  name,
  className,
}: {
  s: Slots
  photoUrl: string | null
  name: string
  className?: string
}) {
  const src = assetUrl(photoUrl)
  if (src) return <img className={cx(s.avatar, className)} src={src} alt={name} loading="lazy" />
  return (
    <div className={cx(s.avatar, s.avatarFallback, className)} role="img" aria-label={name}>
      {initials(name)}
    </div>
  )
}

const contactIcons: Record<ContactKind, ReactNode> = {
  email: <Mail />,
  phone: <Phone />,
  location: <MapPin />,
  website: <Globe />,
}

export function ContactList({ s, data, className }: { s: Slots; data: ResumeData; className?: string }) {
  if (data.contact.length === 0) return null
  return (
    <ul className={cx(s.contactList, className)}>
      {data.contact.map((c) => (
        <li key={c.kind} className={s.contactItem}>
          <span className={s.contactIcon}>{contactIcons[c.kind]}</span>
          {c.href ? (
            <a
              className={s.contactValue}
              href={c.href}
              target={c.kind === 'website' ? '_blank' : undefined}
              rel={c.kind === 'website' ? 'noopener noreferrer' : undefined}
            >
              {c.value}
            </a>
          ) : (
            <span className={s.contactValue}>{c.value}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export function SocialLinks({
  s,
  data,
  showLabels = false,
  className,
}: {
  s: Slots
  data: ResumeData
  showLabels?: boolean
  className?: string
}) {
  if (data.socialLinks.length === 0) return null
  return (
    <ul className={cx(s.socialList, className)} aria-label="Social links">
      {data.socialLinks.map((l) => (
        <li key={l.platform}>
          <a
            className={s.socialLink}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={showLabels ? undefined : l.label}
            title={l.label}
          >
            <BrandIcon platform={l.platform} />
            {showLabels && <span className={s.socialLabel}>{l.label}</span>}
          </a>
        </li>
      ))}
    </ul>
  )
}

export function ProfileUrl({ s, data, prefix }: { s: Slots; data: ResumeData; prefix?: string }) {
  if (!data.profileUrl) return null
  return (
    <a className={s.profileUrl} href={data.profileUrl}>
      {prefix}
      {data.profileUrlLabel}
    </a>
  )
}

export function SummarySection({ s, data, title = 'About Me', showIcon, className }: PartProps) {
  if (!data.summary) return null
  return (
    <Section s={s} title={title} icon={<UserRound />} showIcon={showIcon} className={className}>
      <p className={s.summary}>{data.summary}</p>
    </Section>
  )
}

export function SkillsSection({
  s,
  data,
  title = 'Skills & Expertise',
  showIcon,
  className,
  variant = 'tags',
}: PartProps & { variant?: 'tags' | 'bars' }) {
  if (data.skillCount === 0) return null
  const single = data.skillGroups.length === 1
  return (
    <Section s={s} title={title} icon={<Sparkles />} showIcon={showIcon} className={className}>
      <div className={s.tagGroups}>
        {data.skillGroups.map((g) => (
          <div key={g.name} className={s.tagGroup}>
            {!single && <h3 className={s.tagGroupTitle}>{g.name}</h3>}
            {variant === 'bars' && g.items.some((i) => i.level != null) ? (
              <ul className={s.barList}>
                {g.items.map((skill) => (
                  <li key={skill.name} className={s.bar}>
                    <span className={s.barLabel}>{skill.name}</span>
                    {skill.level != null && (
                      <span className={s.barTrack} aria-label={`${skill.level}%`}>
                        <span className={s.barFill} style={{ width: `${skill.level}%` }} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <ul className={s.tagList}>
                {g.items.map((skill) => (
                  <li key={skill.name} className={s.tag}>
                    {skill.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Section>
  )
}

export function ExperienceSection({ s, data, title = 'Work Experience', showIcon, className }: PartProps) {
  if (data.experiences.length === 0) return null
  return (
    <Section s={s} title={title} icon={<Briefcase />} showIcon={showIcon} className={className}>
      <ol className={s.timeline}>
        {data.experiences.map((w, i) => (
          <li key={`${w.title}-${i}`} className={s.timelineItem}>
            <span className={s.timelineDot} aria-hidden />
            <div className={s.timelineHeader}>
              <h3 className={s.timelineTitle}>{w.title}</h3>
              <p className={s.timelineCompany}>
                {w.company}
                {w.location ? ` · ${w.location}` : ''}
              </p>
              {w.dateRange && <p className={s.timelineMeta}>{w.dateRange}</p>}
            </div>
            {w.description && <p className={s.timelineText}>{w.description}</p>}
            {w.bullets.length > 0 && (
              <ul className={s.bullets}>
                {w.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </Section>
  )
}

export function ProjectsSection({ s, data, title = 'Projects', showIcon, className }: PartProps) {
  if (data.projects.length === 0) return null
  return (
    <Section s={s} title={title} icon={<FolderKanban />} showIcon={showIcon} className={className}>
      <div className={s.projectGrid}>
        {data.projects.map((p, i) => (
          <article key={`${p.title}-${i}`} className={s.projectCard}>
            <h3 className={s.projectTitle}>{p.title}</h3>
            {p.role && <p className={s.projectRole}>{p.role}</p>}
            {p.description && <p className={s.projectText}>{p.description}</p>}
            {p.outcome && <p className={s.projectOutcome}>{p.outcome}</p>}
            {p.tech.length > 0 && (
              <ul className={s.projectTech}>
                {p.tech.map((t) => (
                  <li key={t} className={s.projectTechTag}>
                    {t}
                  </li>
                ))}
              </ul>
            )}
            {p.href && (
              <a className={s.projectLink} href={p.href} target="_blank" rel="noopener noreferrer">
                View project <ExternalLink aria-hidden />
              </a>
            )}
          </article>
        ))}
      </div>
    </Section>
  )
}

export function EducationSection({ s, data, title = 'Education', showIcon, className }: PartProps) {
  if (data.educations.length === 0) return null
  return (
    <Section s={s} title={title} icon={<GraduationCap />} showIcon={showIcon} className={className}>
      <ul className={s.eduList}>
        {data.educations.map((e, i) => (
          <li key={`${e.degree}-${i}`} className={s.eduItem}>
            <h3 className={s.eduDegree}>
              {e.degree}
              {e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ''}
            </h3>
            <p className={s.eduInstitution}>{e.institution}</p>
            {(e.years || e.grade) && (
              <p className={s.eduMeta}>{[e.years, e.grade].filter(Boolean).join(' · ')}</p>
            )}
            {e.description && <p className={s.eduText}>{e.description}</p>}
          </li>
        ))}
      </ul>
    </Section>
  )
}

export function CertificationsSection({ s, data, title = 'Certifications', showIcon, className }: PartProps) {
  if (data.certifications.length === 0) return null
  return (
    <Section s={s} title={title} icon={<BadgeCheck />} showIcon={showIcon} className={className}>
      <ul className={s.certList}>
        {data.certifications.map((c, i) => (
          <li key={`${c.name}-${i}`} className={s.certItem}>
            <h3 className={s.certName}>{c.name}</h3>
            {(c.issuer || c.dateLabel) && (
              <p className={s.certMeta}>{[c.issuer, c.dateLabel].filter(Boolean).join(' · ')}</p>
            )}
            {c.href && (
              <a className={s.certLink} href={c.href} target="_blank" rel="noopener noreferrer">
                View credential <ExternalLink aria-hidden />
              </a>
            )}
          </li>
        ))}
      </ul>
    </Section>
  )
}

export function AchievementsSection({ s, data, title = 'Achievements', showIcon, className }: PartProps) {
  if (data.achievements.length === 0) return null
  return (
    <Section s={s} title={title} icon={<Award />} showIcon={showIcon} className={className}>
      <ul className={s.achList}>
        {data.achievements.map((a, i) => (
          <li key={`${a.title}-${i}`} className={s.achItem}>
            <h3 className={s.achTitle}>{a.title}</h3>
            {a.dateLabel && <p className={s.achMeta}>{a.dateLabel}</p>}
            {a.description && <p className={s.achText}>{a.description}</p>}
          </li>
        ))}
      </ul>
    </Section>
  )
}

export function ServicesSection({ s, data, title = 'Services', showIcon, className }: PartProps) {
  if (data.services.length === 0) return null
  return (
    <Section s={s} title={title} icon={<Wrench />} showIcon={showIcon} className={className}>
      <div className={s.serviceGrid}>
        {data.services.map((sv, i) => (
          <article key={`${sv.name}-${i}`} className={s.serviceCard}>
            <h3 className={s.serviceName}>{sv.name}</h3>
            {sv.description && <p className={s.serviceText}>{sv.description}</p>}
          </article>
        ))}
      </div>
    </Section>
  )
}

/** Role-specific fields (business, industry, company website, GitHub) plus business description. */
export function DetailsSection({ s, data, title = 'Professional Details', showIcon, className }: PartProps) {
  if (data.details.length === 0 && !data.businessDescription) return null
  return (
    <Section s={s} title={title} icon={<Building2 />} showIcon={showIcon} className={className}>
      {data.details.length > 0 && (
        <dl className={s.detailList}>
          {data.details.map((d) => (
            <div key={d.label} className={s.detailItem}>
              <dt className={s.detailLabel}>{d.label}</dt>
              <dd className={s.detailValue}>
                {d.href ? (
                  <a href={d.href} target="_blank" rel="noopener noreferrer">
                    {d.value}
                  </a>
                ) : (
                  d.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {data.businessDescription && <p className={s.summary}>{data.businessDescription}</p>}
    </Section>
  )
}

export function CustomSections({ s, data, showIcon, className }: Omit<PartProps, 'title'>) {
  if (data.customSections.length === 0) return null
  return (
    <>
      {data.customSections.map((c, i) => (
        <Section key={`${c.title}-${i}`} s={s} title={c.title} icon={<FileText />} showIcon={showIcon} className={className}>
          <p className={s.customText}>{c.content}</p>
        </Section>
      ))}
    </>
  )
}

/** Small numeric highlights (used by hero-heavy templates). */
export function statsFor(data: ResumeData) {
  return [
    { label: 'Roles', value: data.experiences.length },
    { label: 'Projects', value: data.projects.length },
    { label: 'Skills', value: data.skillCount },
    { label: 'Certifications', value: data.certifications.length },
  ].filter((x) => x.value > 0)
}
