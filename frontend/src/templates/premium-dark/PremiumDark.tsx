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
import s from './PremiumDark.module.scss'

/** Premium Dark Glass – deep midnight glass with luminous gold accents. */
export default function PremiumDark({ fullName, photoUrl, permanentUrl, mode, actions, compact }: TemplateProps) {
  const data = useResumeData(mode, permanentUrl)

  return (
    <div className={cx(s.page, compact && s.compact)}>
      <span className={s.glowA} aria-hidden />
      <span className={s.glowB} aria-hidden />

      <div className={s.container}>
        <header className={s.hero}>
          <div className={s.heroIdentity}>
            <div className={s.avatarRing}>
              <Avatar s={s} photoUrl={photoUrl} name={fullName} className={s.heroAvatar} />
            </div>
            <div>
              <p className={s.eyebrow}>{mode.modeName}</p>
              <h1 className={s.name}>{fullName}</h1>
              {data.headline && <p className={s.headline}>{data.headline}</p>}
              <SocialLinks s={s} data={data} className={s.heroSocial} />
            </div>
          </div>
          <div className={s.heroContact}>
            <ContactList s={s} data={data} />
            {actions && <div className={s.actions}>{actions}</div>}
          </div>
        </header>

        <SummarySection s={s} data={data} title="Profile" className={s.wide} />

        <div className={s.layout}>
          <main className={s.main}>
            <ExperienceSection s={s} data={data} title="Experience" />
            <ProjectsSection s={s} data={data} title="Selected Projects" />
            <ServicesSection s={s} data={data} />
            <CustomSections s={s} data={data} />
          </main>
          <aside className={s.side}>
            <SkillsSection s={s} data={data} title="Expertise" variant="bars" />
            <DetailsSection s={s} data={data} title="Details" />
            <EducationSection s={s} data={data} />
            <CertificationsSection s={s} data={data} />
            <AchievementsSection s={s} data={data} title="Honours" />
          </aside>
        </div>

        <footer className={s.footer}>
          <ProfileUrl s={s} data={data} />
        </footer>
      </div>
    </div>
  )
}
