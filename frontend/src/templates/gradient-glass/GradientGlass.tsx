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
import s from './GradientGlass.module.scss'

/** Gradient Glass Profile – vibrant aurora gradients behind soft glass. */
export default function GradientGlass({ fullName, photoUrl, permanentUrl, mode, actions, compact }: TemplateProps) {
  const data = useResumeData(mode, permanentUrl)

  return (
    <div className={cx(s.page, compact && s.compact)}>
      <div className={s.aurora} aria-hidden>
        <span className={s.blob1} />
        <span className={s.blob2} />
        <span className={s.blob3} />
        <span className={s.blob4} />
      </div>

      <div className={s.container}>
        <header className={s.hero}>
          <Avatar s={s} photoUrl={photoUrl} name={fullName} className={s.heroAvatar} />
          <h1 className={s.name}>{fullName}</h1>
          {data.headline && <p className={s.headline}>{data.headline}</p>}
          <ContactList s={s} data={data} />
          {actions && <div className={s.actions}>{actions}</div>}
          <SocialLinks s={s} data={data} />
        </header>

        <SummarySection s={s} data={data} className={s.summaryCard} />
        <ExperienceSection s={s} data={data} className={s.full} />

        <div className={s.masonry}>
          <SkillsSection s={s} data={data} />
          <EducationSection s={s} data={data} />
          <CertificationsSection s={s} data={data} />
          <AchievementsSection s={s} data={data} />
          <DetailsSection s={s} data={data} />
          <ServicesSection s={s} data={data} />
          <CustomSections s={s} data={data} />
        </div>

        <ProjectsSection s={s} data={data} className={s.full} />

        <footer className={s.footer}>
          <ProfileUrl s={s} data={data} />
        </footer>
      </div>
    </div>
  )
}
