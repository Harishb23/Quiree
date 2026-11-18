import { BusinessStorefront } from '../storefront/BusinessStorefront'
import type { PublicBusiness } from '../../../types/business'
import styles from './Profile.module.scss'

/** Phone-framed live preview of the storefront, built from unsaved form values. */
export function BusinessProfilePreview({ business }: { business: PublicBusiness }) {
  return (
    <div className={styles.previewFrame} aria-label="Live preview of your business profile">
      <div className={styles.previewScreen}>
        <BusinessStorefront business={business} preview />
      </div>
    </div>
  )
}
