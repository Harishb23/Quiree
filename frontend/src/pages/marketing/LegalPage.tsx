import { Mail } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { company } from '../../content/siteContent'
import styles from './Marketing.module.scss'

const titles = {
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
} as const

/**
 * Placeholder for legal documents so footer links resolve.
 * TODO(client): replace with the final, legally reviewed Privacy Policy and Terms of Service text.
 */
export default function LegalPage({ kind }: { kind: keyof typeof titles }) {
  const title = titles[kind]
  return (
    <>
      <header className={styles.pageHero}>
        <span className={styles.eyebrow}>Legal</span>
        <h1>{title}</h1>
        <p>Our {title.toLowerCase()} is being finalised and will be published on this page.</p>
      </header>
      <section className={`${styles.section} ${styles.narrow}`} aria-label={title}>
        <div className={styles.note}>
          If you have any questions in the meantime, please contact us at{' '}
          <a href={`mailto:${company.email}`}>{company.email}</a>.
        </div>
        <div className={styles.actionsRow} style={{ marginTop: 24 }}>
          <Button to="/contact" icon={<Mail />}>
            Contact support
          </Button>
          <Button to="/" variant="outline">
            Back to home
          </Button>
        </div>
      </section>
    </>
  )
}
