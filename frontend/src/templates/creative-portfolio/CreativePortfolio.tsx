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
import s from './CreativePortfolio.module.scss'

/** Creative Portfolio Resume – bold, warm and project-forward. */
export default function CreativePortfolio({
  fullName,
  photoUrl,
  permanentUrl,
  mode,
  actions,
  compact,
}: TemplateProps) {
  const data = useResumeData(mode, permanentUrl)
  const [first, ...rest] = fullName.trim().split(/\s+/)

  return (
    <div className={cx(s.page, compact && s.compact)}>
      <div className={s.container}>
        <header className={s.hero}>
          <div className={s.heroText}>
            <p className={s.hello}>Hello, I’m</p>
            <h1 className={s.name}>
              <span>{first}</span>
              {rest.length > 0 && (
                <>
                  {' '}
                  <span className={s.nameOutline}>{rest.join(' ')}</span>
                </>
              )}
            </h1>
            {data.headline && <p className={s.headline}>{data.headline}</p>}
            {actions && <div className={s.actions}>{actions}</div>}
            <SocialLinks s={s} data={data} />
          </div>
          <div className={s.heroVisual}>
            <span className={s.frame} aria-hidden />
            <Avatar s={s} photoUrl={photoUrl} name={fullName} className={s.heroAvatar} />
            <span className={s.sticker}>{mode.modeName}</span>
          </div>
        </header>

        <div className={s.strip}>
          <ContactList s={s} data={data} />
        </div>

        <SummarySection s={s} data={data} title="My Story" />
        <ProjectsSection s={s} data={data} title="Featured Work" className={s.work} />

        <div className={s.layout}>
          <main className={s.col}>
            <ExperienceSection s={s} data={data} title="Journey" />
            <ServicesSection s={s} data={data} title="What I Offer" />
            <CustomSections s={s} data={data} />
          </main>
          <aside className={s.col}>
            <SkillsSection s={s} data={data} title="Toolbox" />
            <DetailsSection s={s} data={data} title="Studio" />
            <EducationSection s={s} data={data} />
            <CertificationsSection s={s} data={data} />
            <AchievementsSection s={s} data={data} title="Recognition" />
          </aside>
        </div>

        <footer className={s.footer}>
          <ProfileUrl s={s} data={data} />
        </footer>
      </div>
    </div>
  )
}
