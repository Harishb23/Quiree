import { Quote } from 'lucide-react'
import type { TemplateProps } from '../types'
import {
  AchievementsSection,
  Avatar,
  CertificationsSection,
  ContactList,
  CustomSections,
  DetailsSection,
  EducationSection,
  ExperienceSection,
  ProfileUrl,
  ProjectsSection,
  ServicesSection,
  SkillsSection,
  SocialLinks,
  cx,
  statsFor,
  useResumeData,
} from '../shared'
import s from './PersonalBranding.module.scss'

/** Premium Personal Branding Resume – magazine-style hero for personal brands. */
export default function PersonalBranding({
  fullName,
  photoUrl,
  permanentUrl,
  mode,
  actions,
  compact,
}: TemplateProps) {
  const data = useResumeData(mode, permanentUrl)
  const stats = statsFor(data)

  return (
    <div className={cx(s.page, compact && s.compact)}>
      <header className={s.hero}>
        <div className={s.heroInner}>
          <div className={s.heroCopy}>
            <p className={s.kicker}>{mode.modeName}</p>
            <h1 className={s.name}>{fullName}</h1>
            {data.headline && <p className={s.headline}>{data.headline}</p>}
            {data.summary && (
              <blockquote className={s.quote}>
                <Quote aria-hidden className={s.quoteMark} />
                <p>{data.summary}</p>
              </blockquote>
            )}
            {actions && <div className={s.actions}>{actions}</div>}
          </div>
          <div className={s.portrait}>
            <Avatar s={s} photoUrl={photoUrl} name={fullName} className={s.portraitImg} />
            <span className={s.portraitBadge}>{fullName.split(/\s+/)[0]}</span>
          </div>
        </div>

        {stats.length > 0 && (
          <dl className={s.stats}>
            {stats.map((st) => (
              <div key={st.label} className={s.stat}>
                <dt>{st.label}</dt>
                <dd>{st.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </header>

      <div className={s.container}>
        {(data.contact.length > 0 || data.socialLinks.length > 0) && (
          <section className={s.connect} aria-label="Contact">
            <ContactList s={s} data={data} />
            <SocialLinks s={s} data={data} showLabels />
          </section>
        )}

        <div className={s.layout}>
          <main className={s.col}>
            <ExperienceSection s={s} data={data} title="Career Story" />
            <ProjectsSection s={s} data={data} title="Signature Work" />
            <ServicesSection s={s} data={data} title="Work With Me" />
            <CustomSections s={s} data={data} />
          </main>
          <aside className={s.col}>
            <SkillsSection s={s} data={data} title="Expertise" />
            <AchievementsSection s={s} data={data} title="Milestones" />
            <DetailsSection s={s} data={data} title="Brand" />
            <CertificationsSection s={s} data={data} />
            <EducationSection s={s} data={data} />
          </aside>
        </div>

        <footer className={s.footer}>
          <ProfileUrl s={s} data={data} />
        </footer>
      </div>
    </div>
  )
}
