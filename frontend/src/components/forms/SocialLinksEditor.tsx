import { Plus, Trash2 } from 'lucide-react'
import type { SocialLink, SocialPlatform } from '../../types/api'
import { BrandIcon, platformLabels } from '../ui/BrandIcon'
import { Button } from '../ui/Button'
import { TextField } from '../ui/Field'
import { normalizeUrlInput, normalizeWhatsApp } from '../../lib/url'
import styles from './Forms.module.scss'

const ALL: SocialPlatform[] = ['LinkedIn', 'GitHub', 'Instagram', 'Facebook', 'WhatsApp', 'Twitter', 'YouTube', 'Website']

const placeholders: Record<SocialPlatform, string> = {
  LinkedIn: 'linkedin.com/in/your-name',
  GitHub: 'github.com/your-name',
  Instagram: 'instagram.com/your-name',
  Facebook: 'facebook.com/your-name',
  WhatsApp: '+91 98765 43210 or wa.me link',
  Twitter: 'x.com/your-name',
  YouTube: 'youtube.com/@your-channel',
  Website: 'yourwebsite.com',
}

/** Converts what the user typed into the absolute URL the API expects. */
export function normalizeSocialLinks(links: SocialLink[]): SocialLink[] {
  return links
    .map((l) => ({
      platform: l.platform,
      url: l.platform === 'WhatsApp' ? normalizeWhatsApp(l.url) : normalizeUrlInput(l.url),
    }))
    .filter((l) => l.url)
}

export function SocialLinksEditor({
  value,
  onChange,
  errors,
}: {
  value: SocialLink[]
  onChange: (links: SocialLink[]) => void
  errors?: Record<number, string>
}) {
  const used = new Set(value.map((l) => l.platform))
  const available = ALL.filter((p) => !used.has(p))

  return (
    <div className={styles.socialList}>
      {value.map((link, index) => (
        <div key={link.platform} className={styles.socialRow}>
          <span className={styles.socialIcon} title={platformLabels[link.platform]}>
            <BrandIcon platform={link.platform} />
          </span>
          <TextField
            className={styles.grow}
            aria-label={`${platformLabels[link.platform]} link`}
            placeholder={placeholders[link.platform]}
            value={link.url}
            error={errors?.[index]}
            onChange={(e) => onChange(value.map((l, i) => (i === index ? { ...l, url: e.target.value } : l)))}
          />
          <button
            type="button"
            className={styles.removeBtn}
            aria-label={`Remove ${platformLabels[link.platform]}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <Trash2 />
          </button>
        </div>
      ))}
      {available.length > 0 && (
        <div className={styles.chipRow}>
          {available.map((p) => (
            <Button
              key={p}
              size="sm"
              variant="secondary"
              icon={<Plus />}
              onClick={() => onChange([...value, { platform: p, url: '' }])}
            >
              {platformLabels[p]}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
