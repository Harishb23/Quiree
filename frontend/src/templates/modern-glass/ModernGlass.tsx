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
  SummarySection,
  cx,
  useResumeData,
} from '../shared'
import s from './ModernGlass.module.scss'

/** Modern Glass Resume – frosted violet glass with a timeline layout. */
export default function ModernGlass({ fullName, photoUrl, permanentUrl, mode, actions, compact }: TemplateProps) {
  const data = useResumeData(mode, permanentUrl)

  return (
    <div className={cx(s.page, compact && s.compact)}>
      <div className={s.banner} aria-hidden>
        <span className={s.peakBack} />
        <span className={s.peakFront} />
      </div>

      <div className={s.container}>
        <header className={s.hero}>
          <div className={s.avatarRing}>
            <Avatar s={s} photoUrl={photoUrl} name={fullName} className={s.heroAvatar} />
          </div>
          <div className={s.identity}>
            <h1 className={s.name}>{fullName}</h1>
            {mode.designation && <p className={s.designation}>{mode.designation}</p>}
            {mode.companyName && <p className={s.company}>{mode.companyName}</p>}
          </div>
        </header>

        <div className={s.layout}>
          <aside className={s.side}>
            {(data.contact.length > 0 || data.socialLinks.length > 0 || actions) && (
            <section className={s.contactCard} aria-label="Contact">
              <h2 className={s.contactTitle}>Contact Me</h2>
              <ContactList s={s} data={data} />
              {actions && <div className={s.actions}>{actions}</div>}
              <SocialLinks s={s} data={data} />
              <ProfileUrl s={s} data={data} />
            </section>
            )}
            <DetailsSection s={s} data={data} />
            <CertificationsSection s={s} data={data} />
          </aside>

          <main className={s.main}>
            <SummarySection s={s} data={data} />
            <SkillsSection s={s} data={data} title="Skills" />
            <ExperienceSection s={s} data={data} />
            <ProjectsSection s={s} data={data} />
            <EducationSection s={s} data={data} />
            <AchievementsSection s={s} data={data} />
            <ServicesSection s={s} data={data} />
            <CustomSections s={s} data={data} />
          </main>
        </div>
      </div>
    </div>
  )
}
