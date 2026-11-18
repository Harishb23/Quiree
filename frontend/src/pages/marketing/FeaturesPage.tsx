import { Info } from 'lucide-react'
import { features, honestNotes, viewerFlow } from '../../content/siteContent'
import { CtaBanner, FeatureIcon, SectionHeading } from './shared'
import styles from './Marketing.module.scss'

export default function FeaturesPage() {
  return (
    <>
      <header className={styles.pageHero}>
        <span className={styles.eyebrow}>Features</span>
        <h1>
          Built for <span className={styles.gradientText}>multi-role professionals</span>
        </h1>
        <p>Multiple identities, one permanent QR code, and a viewer experience that just works.</p>
      </header>

      <section className={styles.section} aria-labelledby="all-features">
        <SectionHeading id="all-features" eyebrow="Platform" title="Everything in one place" />
        <div className={styles.featureGrid}>
          {features.map((f) => (
            <article key={f.title} className={styles.featureCard}>
              <FeatureIcon icon={f.icon} />
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} id="viewer-flow" aria-labelledby="viewer-title">
        <SectionHeading
          id="viewer-title"
          eyebrow="Viewer Experience"
          title="What happens when someone scans your QR"
          subtitle="No app, no sign-up. Just your profile — the right mode, every time."
        />
        <ol className={styles.steps} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {viewerFlow.slice(0, 3).map((s, i) => (
            <li key={s.title} className={styles.step}>
              <span className={styles.stepNumber}>{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
            </li>
          ))}
        </ol>
        <div className={styles.cardGrid2} style={{ marginTop: 18 }}>
          <article className={styles.infoCard}>
            <h3>4. {viewerFlow[3]!.title}</h3>
            <p>{viewerFlow[3]!.description}</p>
          </article>
          <article className={styles.infoCard}>
            <h3>“Your Choice” mode</h3>
            <p>
              Viewers can pick one or several of your published modes. Their choice is remembered, so if you change
              your default mode later, a returning viewer still sees what they chose — as long as that mode is still
              published.
            </p>
          </article>
        </div>
        <div className={styles.notes}>
          {honestNotes.map((n) => (
            <p key={n} className={styles.note}>
              <Info size={18} aria-hidden /> {n}
            </p>
          ))}
        </div>
      </section>

      <CtaBanner title="See it with your own profile" subtitle="Create your account and share your QR code today." />
    </>
  )
}
