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
import s from './NeonTech.module.scss'

/** Neon Technology Resume – cyber neon glow for technologists. */
export default function NeonTech({ fullName, photoUrl, permanentUrl, mode, actions, compact }: TemplateProps) {
  const data = useResumeData(mode, permanentUrl)

  return (
    <div className={cx(s.page, compact && s.compact)}>
      <div className={s.grid} aria-hidden />
      <div className={s.container}>
        <header className={s.terminal}>
          <div className={s.termBar} aria-hidden>
            <span />
            <span />
            <span />
            <em>~/profile/{mode.modeName.toLowerCase().replace(/\s+/g, '-')}</em>
          </div>
          <div className={s.termBody}>
            <div className={s.avatarWrap}>
              <Avatar s={s} photoUrl={photoUrl} name={fullName} className={s.termAvatar} />
            </div>
            <div className={s.termText}>
              <p className={s.prompt} aria-hidden>
                $ whoami
              </p>
              <h1 className={s.name}>{fullName}</h1>
              {mode.designation && (
                <p className={s.role}>
                  <span aria-hidden>&gt; </span>
                  {mode.designation}
                </p>
              )}
              {mode.companyName && <p className={s.company}>@ {mode.companyName}</p>}
              <SocialLinks s={s} data={data} className={s.termSocial} />
            </div>
            <div className={s.termContact}>
              <ContactList s={s} data={data} />
              {actions && <div className={s.actions}>{actions}</div>}
            </div>
          </div>
        </header>

        <div className={s.layout}>
          <main className={s.col}>
            <SummarySection s={s} data={data} title="readme" />
            <ExperienceSection s={s} data={data} title="experience" />
            <ProjectsSection s={s} data={data} title="projects" />
            <ServicesSection s={s} data={data} title="services" />
            <CustomSections s={s} data={data} />
          </main>
          <aside className={s.col}>
            <SkillsSection s={s} data={data} title="stack" variant="bars" />
            <DetailsSection s={s} data={data} title="links" />
            <CertificationsSection s={s} data={data} title="certifications" />
            <EducationSection s={s} data={data} title="education" />
            <AchievementsSection s={s} data={data} title="achievements" />
          </aside>
        </div>

        <footer className={s.footer}>
          <ProfileUrl s={s} data={data} prefix="↗ " />
        </footer>
      </div>
    </div>
  )
}
