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
import s from './Minimal.module.scss'

/** Minimal Professional Resume – clean, typographic and print friendly. */
export default function Minimal({ fullName, photoUrl, permanentUrl, mode, actions, compact }: TemplateProps) {
  const data = useResumeData(mode, permanentUrl)

  return (
    <div className={cx(s.page, compact && s.compact)}>
      <article className={s.sheet}>
        <header className={s.header}>
          <div className={s.identity}>
            <h1 className={s.name}>{fullName}</h1>
            {data.headline && <p className={s.headline}>{data.headline}</p>}
            <ContactList s={s} data={data} />
            <SocialLinks s={s} data={data} showLabels />
          </div>
          <Avatar s={s} photoUrl={photoUrl} name={fullName} className={s.headerAvatar} />
        </header>

        {actions && <div className={s.actions}>{actions}</div>}

        <div className={s.body}>
          <SummarySection s={s} data={data} title="Summary" showIcon={false} />
          <SkillsSection s={s} data={data} title="Skills" showIcon={false} />
          <ExperienceSection s={s} data={data} title="Experience" showIcon={false} />
          <ProjectsSection s={s} data={data} showIcon={false} />
          <EducationSection s={s} data={data} showIcon={false} />
          <CertificationsSection s={s} data={data} showIcon={false} />
          <AchievementsSection s={s} data={data} showIcon={false} />
          <ServicesSection s={s} data={data} showIcon={false} />
          <DetailsSection s={s} data={data} title="Details" showIcon={false} />
          <CustomSections s={s} data={data} showIcon={false} />
        </div>

        <footer className={s.footer}>
          <ProfileUrl s={s} data={data} />
        </footer>
      </article>
    </div>
  )
}
