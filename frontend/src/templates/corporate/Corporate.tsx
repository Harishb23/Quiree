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
import s from './Corporate.module.scss'

/** Corporate Executive Resume – navy executive styling with a structured sidebar. */
export default function Corporate({ fullName, photoUrl, permanentUrl, mode, actions, compact }: TemplateProps) {
  const data = useResumeData(mode, permanentUrl)

  return (
    <div className={cx(s.page, compact && s.compact)}>
      <div className={s.frame}>
        <aside className={s.sidebar}>
          <Avatar s={s} photoUrl={photoUrl} name={fullName} className={s.sideAvatar} />
          {data.contact.length > 0 && (
          <section className={s.sideBlock} aria-label="Contact">
            <h2 className={s.sideTitle}>Contact</h2>
            <ContactList s={s} data={data} />
          </section>
          )}
          <SocialLinks s={s} data={data} className={s.sideSocial} />
          <div className={s.sideSections}>
            <SkillsSection s={s} data={data} title="Core Competencies" showIcon={false} />
            <EducationSection s={s} data={data} showIcon={false} />
            <CertificationsSection s={s} data={data} showIcon={false} />
          </div>
          <ProfileUrl s={s} data={data} />
        </aside>

        <main className={s.main}>
          <header className={s.header}>
            <h1 className={s.name}>{fullName}</h1>
            {mode.designation && <p className={s.designation}>{mode.designation}</p>}
            {mode.companyName && <p className={s.company}>{mode.companyName}</p>}
            {actions && <div className={s.actions}>{actions}</div>}
          </header>
          <div className={s.mainSections}>
            <SummarySection s={s} data={data} title="Executive Summary" />
            <ExperienceSection s={s} data={data} title="Professional Experience" />
            <ProjectsSection s={s} data={data} title="Key Projects" />
            <AchievementsSection s={s} data={data} title="Key Achievements" />
            <ServicesSection s={s} data={data} />
            <DetailsSection s={s} data={data} title="Organisation" />
            <CustomSections s={s} data={data} />
          </div>
        </main>
      </div>
    </div>
  )
}
