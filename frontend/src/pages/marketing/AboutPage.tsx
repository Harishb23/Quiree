import { Compass, Eye, Gem, Infinity as InfinityIcon, ShieldCheck, Target, UserCheck } from 'lucide-react'
import { aboutTeaser, values, vision } from '../../content/siteContent'
import { config } from '../../config'
import { CtaBanner, FounderCard, SectionHeading } from './shared'
import styles from './Marketing.module.scss'

const valueIcons = [<UserCheck key="u" />, <InfinityIcon key="i" />, <Gem key="g" />, <ShieldCheck key="s" />]

export default function AboutPage() {
  return (
    <>
      <header className={styles.pageHero}>
        <span className={styles.eyebrow}>About Us</span>
        <h1>
          We help professionals be <span className={styles.gradientText}>every version</span> of themselves
        </h1>
        <p>
          {config.appName} turns the many roles you play into beautiful, resume-quality profiles — all shared through one
          permanent QR code.
        </p>
      </header>

      <section className={styles.section} aria-labelledby="story-title">
        <div className={styles.twoCol}>
          <div className={styles.prose}>
            <SectionHeading id="story-title" eyebrow="Our Story" title={aboutTeaser.title} align="left" />
            {aboutTeaser.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <div className={styles.statGrid}>
            <div>
              <strong>Multi-mode</strong>
              <span>Independent identities, one account</span>
            </div>
            <div>
              <strong>Permanent</strong>
              <span>Links and QR codes that never break</span>
            </div>
            <div>
              <strong>Resume-grade</strong>
              <span>Complete profiles, not tiny cards</span>
            </div>
            <div>
              <strong>Private</strong>
              <span>You choose what is published</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="vision" aria-labelledby="vision-title">
        <SectionHeading id="vision-title" eyebrow="Vision & Mission" title="Where we are heading" />
        <div className={styles.cardGrid2}>
          <article className={styles.infoCard}>
            <span className={styles.featureIcon}>
              <Eye />
            </span>
            <h3>Our Vision</h3>
            <p>{vision.vision}</p>
          </article>
          <article className={styles.infoCard}>
            <span className={styles.featureIcon}>
              <Target />
            </span>
            <h3>Our Mission</h3>
            <p>{vision.mission}</p>
          </article>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="values-title">
        <SectionHeading id="values-title" eyebrow="Our Values" title="What guides every decision" />
        <div className={styles.cardGrid}>
          {values.map((v, i) => (
            <article key={v.title} className={styles.infoCard}>
              <span className={styles.featureIcon}>{valueIcons[i] ?? <Compass />}</span>
              <h3>{v.title}</h3>
              <p>{v.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} id="founder" aria-labelledby="founder-title">
        <SectionHeading id="founder-title" eyebrow="Founder / CEO" title="Meet the founder" />
        <FounderCard />
      </section>

      <CtaBanner
        title="Ready to Build Your Digital Identity?"
        subtitle="Create your first professional mode in minutes — it’s free to start."
      />
    </>
  )
}
