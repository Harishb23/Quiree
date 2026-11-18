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
import s from './SplitLayout.module.scss'

/** Modern Split Layout – two-panel layout with a fixed identity column. */
export default function SplitLayout({ fullName, photoUrl, permanentUrl, mode, actions, compact }: TemplateProps) {
  const data = useResumeData(mode, permanentUrl)

  return (
    <div className={cx(s.page, compact && s.compact)}>
      <aside className={s.identity}>
        <div className={s.identityInner}>
          <Avatar s={s} photoUrl={photoUrl} name={fullName} className={s.idAvatar} />
          <h1 className={s.name}>{fullName}</h1>
          {mode.designation && <p className={s.designation}>{mode.designation}</p>}
          {mode.companyName && <p className={s.company}>{mode.companyName}</p>}
          {actions && <div className={s.actions}>{actions}</div>}
          <ContactList s={s} data={data} className={s.idContact} />
          <SocialLinks s={s} data={data} />
          <SkillsSection s={s} data={data} title="Skills" showIcon={false} className={s.idSkills} />
          <ProfileUrl s={s} data={data} />
        </div>
      </aside>

      <main className={s.content}>
        <SummarySection s={s} data={data} />
        <ExperienceSection s={s} data={data} />
        <ProjectsSection s={s} data={data} />
        <div className={s.pair}>
          <EducationSection s={s} data={data} />
          <CertificationsSection s={s} data={data} />
        </div>
        <AchievementsSection s={s} data={data} />
        <ServicesSection s={s} data={data} />
        <DetailsSection s={s} data={data} />
        <CustomSections s={s} data={data} />
      </main>
    </div>
  )
}
