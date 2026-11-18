import { ArrowLeft, Mail } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import styles from './Marketing.module.scss'

export default function NotFoundPage() {
  return (
    <section className={styles.notFound}>
      <div className={styles.code} aria-hidden>
        404
      </div>
      <h1>Page not found</h1>
      <p>The page you are looking for doesn’t exist or may have moved.</p>
      <div className={styles.actionsRow}>
        <Button to="/" icon={<ArrowLeft />}>
          Back to home
        </Button>
        <Button to="/contact" variant="secondary" icon={<Mail />}>
          Contact us
        </Button>
      </div>
    </section>
  )
}
