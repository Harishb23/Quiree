import { Mail, MessageCircle, Phone } from 'lucide-react'
import { TextField } from '../../ui/Field'
import type { BusinessUpsertRequest } from '../../../types/business'
import type { FormErrors } from './businessForm'
import styles from './Profile.module.scss'

/** Email, phone and WhatsApp fields. Customers use these from the storefront's quick actions. */
export function BusinessContactInformation({
  form,
  set,
  errors,
}: {
  form: BusinessUpsertRequest
  set: (patch: Partial<BusinessUpsertRequest>) => void
  errors: FormErrors
}) {
  const sameAsPhone = !!form.phone && form.whatsApp === form.phone
  return (
    <div className={styles.grid2}>
      <TextField
        label="Business phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        icon={<Phone />}
        placeholder="+91 98765 43210"
        value={form.phone ?? ''}
        error={errors.phone}
        onChange={(e) => set(sameAsPhone ? { phone: e.target.value, whatsApp: e.target.value } : { phone: e.target.value })}
      />
      <div className={styles.stackTight}>
        <TextField
          label="WhatsApp number"
          type="tel"
          inputMode="tel"
          icon={<MessageCircle />}
          placeholder="+91 98765 43210"
          value={form.whatsApp ?? ''}
          error={errors.whatsApp}
          onChange={(e) => set({ whatsApp: e.target.value })}
        />
        {form.phone && (
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={sameAsPhone} onChange={(e) => set({ whatsApp: e.target.checked ? form.phone : null })} />
            Same as business phone
          </label>
        )}
      </div>
      <TextField
        className={styles.span2}
        label="Business email"
        type="email"
        inputMode="email"
        autoComplete="email"
        icon={<Mail />}
        placeholder="hello@yourshop.com"
        value={form.email ?? ''}
        error={errors.email}
        hint="Enquiry notifications go to your account email; this one is shown to customers."
        onChange={(e) => set({ email: e.target.value })}
      />
    </div>
  )
}
