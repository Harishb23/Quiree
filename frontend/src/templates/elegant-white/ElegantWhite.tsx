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
import s from './ElegantWhite.module.scss'

/** Elegant White Resume – airy white glass with serif headings. */
export default function ElegantWhite({ fullName, photoUrl, permanentUrl, mode, actions, compact }: TemplateProps) {
  const data = useResumeData(mode, permanentUrl)

  return (
    <div className={cx(s.page, compact && s.compact)}>
      <div className={s.container}>
        <header className={s.header}>
          <Avatar s={s} photoUrl={photoUrl} name={fullName} className={s.headerAvatar} />
          <h1 className={s.name}>{fullName}</h1>
          <div className={s.ornament} aria-hidden>
            <span />◆<span />
          </div>
          {mode.designation && <p className={s.designation}>{mode.designation}</p>}
          {mode.companyName && <p className={s.company}>{mode.companyName}</p>}
          {actions && <div className={s.actions}>{actions}</div>}
        </header>

        <div className={s.layout}>
          <aside className={s.side}>
            {(data.contact.length > 0 || data.socialLinks.length > 0) && (
            <section className={s.section} aria-label="Contact">
              <h2 className={s.sectionTitle}>Contact</h2>
              <ContactList s={s} data={data} />
              <SocialLinks s={s} data={data} className={s.sideSocial} />
            </section>
            )}
            <SkillsSection s={s} data={data} title="Expertise" showIcon={false} />
            <EducationSection s={s} data={data} showIcon={false} />
            <CertificationsSection s={s} data={data} showIcon={false} />
            <DetailsSection s={s} data={data} title="Details" showIcon={false} />
          </aside>
          <main className={s.main}>
            <SummarySection s={s} data={data} title="Profile" showIcon={false} />
            <ExperienceSection s={s} data={data} title="Experience" showIcon={false} />
            <ProjectsSection s={s} data={data} showIcon={false} />
            <AchievementsSection s={s} data={data} showIcon={false} />
            <ServicesSection s={s} data={data} showIcon={false} />
            <CustomSections s={s} data={data} showIcon={false} />
          </main>
        </div>

        <footer className={s.footer}>
          <ProfileUrl s={s} data={data} />
        </footer>
      </div>
    </div>
  )
}
