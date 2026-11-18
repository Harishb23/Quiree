import { ChevronDown, ShieldCheck } from 'lucide-react'
import { pricingFaq } from '../../content/siteContent'
import { CtaBanner, PlanGrid, SectionHeading } from './shared'
import styles from './Marketing.module.scss'

export default function PricingPage() {
  return (
    <>
      <header className={styles.pageHero}>
        <span className={styles.eyebrow}>Pricing</span>
        <h1>
          Simple, <span className={styles.gradientText}>transparent</span> pricing
        </h1>
        <p>Start free. Upgrade for more professional modes and every premium template. Your QR code never changes.</p>
      </header>

      <section className={styles.section} aria-label="Plans">
        <PlanGrid />
        <p className={styles.centered} style={{ gap: 8, alignItems: 'center', fontSize: 14 }}>
          <ShieldCheck size={16} aria-hidden /> Secure payments by Razorpay · Plans activate after server-side
          verification
        </p>
      </section>

      <section className={`${styles.section} ${styles.narrow}`} aria-labelledby="faq-title">
        <SectionHeading id="faq-title" eyebrow="FAQ" title="Frequently asked questions" />
        <div className={styles.faq}>
          {pricingFaq.map((item) => (
            <details key={item.q}>
              <summary>
                {item.q}
                <ChevronDown size={18} aria-hidden />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <CtaBanner title="Start free today" subtitle="No credit card required for the Free plan." />
    </>
  )
}
