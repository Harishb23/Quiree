import { useState } from 'react'
import { ArrowLeft, Check, Download, Home, Share2, Sparkles } from 'lucide-react'
import type { PublicMode, PublicProfile } from '../types/api'
import { modeTypes } from '../lib/modeTypes'
import { assetUrl, safeUrl } from '../lib/url'
import { initials } from '../lib/format'
import { BrandIcon, platformLabels } from '../components/ui/BrandIcon'
import { LogoMark } from '../components/ui/Logo'
import { config } from '../config'
import styles from './ViewerScreens.module.scss'

function Avatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const [failed, setFailed] = useState(false)
  const src = assetUrl(photoUrl)
  return src && !failed ? (
    <img className={styles.avatar} src={src} alt={name} onError={() => setFailed(true)} referrerPolicy="no-referrer" />
  ) : (
    <span className={[styles.avatar, styles.avatarFallback].join(' ')} role="img" aria-label={name}>
      {initials(name) || '?'}
    </span>
  )
}

/** Step 2 of the scan flow: the viewer picks which professional side to view. */
export function ModeChooserScreen({
  profile,
  initial,
  allowMultiple,
  onConfirm,
  onCancel,
}: {
  profile: PublicProfile
  initial: string[]
  allowMultiple: boolean
  onConfirm: (modeIds: string[]) => void
  onCancel?: () => void
}) {
  const [picked, setPicked] = useState<string[]>(initial)
  const toggle = (id: string) =>
    setPicked((p) => (allowMultiple ? (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]) : [id]))

  const tagline = profile.modes.map((m) => m.modeName).join(' • ')

  return (
    <div className={styles.screen}>
      <div className={styles.panel}>
        {onCancel && (
          <button type="button" className={styles.back} onClick={onCancel} aria-label="Back to profile">
            <ArrowLeft />
          </button>
        )}
        <div className={styles.brand}>
          <LogoMark size={28} />
          <span>{config.appName}</span>
        </div>
        <Avatar name={profile.fullName} photoUrl={profile.photoUrl} />
        <h1 className={styles.name}>{profile.fullName}</h1>
        <p className={styles.tagline}>{tagline}</p>

        <h2 className={styles.heading}>
          <Sparkles /> Choose a Profile Mode
        </h2>
        {allowMultiple && <p className={styles.hint}>Tap one or more — we’ll remember your choice on this device.</p>}

        <div className={styles.modeList} role={allowMultiple ? 'group' : 'radiogroup'} aria-label="Profile modes">
          {profile.modes.map((m) => (
            <ModeOption key={m.id} mode={m} checked={picked.includes(m.id)} multiple={allowMultiple} onToggle={() => toggle(m.id)} />
          ))}
        </div>

        <button type="button" className={styles.primary} disabled={!picked.length} onClick={() => onConfirm(picked)}>
          View Profile
        </button>
      </div>
    </div>
  )
}

function ModeOption({ mode, checked, multiple, onToggle }: { mode: PublicMode; checked: boolean; multiple: boolean; onToggle: () => void }) {
  const Icon = modeTypes[mode.modeType]?.icon ?? Sparkles
  return (
    <label className={[styles.mode, checked && styles.modeChecked].filter(Boolean).join(' ')}>
      <input type={multiple ? 'checkbox' : 'radio'} name="profile-mode" checked={checked} onChange={onToggle} />
      <span className={styles.modeIcon}>
        <Icon />
      </span>
      <span className={styles.modeText}>
        <strong>{mode.modeName}</strong>
        {(mode.designation || mode.companyName) && <small>{[mode.designation, mode.companyName].filter(Boolean).join(' · ')}</small>}
      </span>
      <span className={styles.radio} aria-hidden>
        {checked && <Check />}
      </span>
    </label>
  )
}

/** Step 4: shown after the vCard download starts. */
export function ContactSavedScreen({
  profile,
  mode,
  vcardHref,
  canInstall,
  onInstall,
  onShare,
  onBack,
}: {
  profile: PublicProfile
  mode: PublicMode
  vcardHref: string
  canInstall: boolean
  onInstall: () => void
  onShare: () => void
  onBack: () => void
}) {
  const firstName = profile.fullName.split(' ')[0] ?? profile.fullName
  const socials = mode.socialLinks.flatMap((l) => {
    const href = safeUrl(l.url)
    return href ? [{ ...l, href }] : []
  })

  return (
    <div className={styles.screen}>
      <div className={styles.panel}>
        <div className={styles.success} aria-hidden>
          <Check />
        </div>
        <h1 className={styles.name}>Contact Ready!</h1>
        <p className={styles.tagline}>
          {profile.fullName}’s contact card has been downloaded. Open it and tap <strong>Save</strong> to add {firstName} to your
          contacts.
        </p>
        <a className={styles.textLink} href={vcardHref} download>
          <Download /> Download again
        </a>

        {canInstall && (
          <button type="button" className={styles.installCard} onClick={onInstall}>
            <Home />
            <span>
              <strong>Add to Home Screen</strong>
              <small>Keep {firstName}’s profile one tap away.</small>
            </span>
          </button>
        )}

        <button type="button" className={styles.primary} onClick={onShare}>
          <Share2 /> Share Profile
        </button>

        {socials.length > 0 && (
          <div className={styles.explore}>
            <strong>Explore More</strong>
            <small>Follow on social media</small>
            <div className={styles.socials}>
              {socials.map((l) => (
                <a key={l.platform} href={l.href} target="_blank" rel="noopener noreferrer" aria-label={platformLabels[l.platform]}>
                  <BrandIcon platform={l.platform} size={20} />
                </a>
              ))}
            </div>
          </div>
        )}

        <button type="button" className={styles.secondary} onClick={onBack}>
          Back to Profile
        </button>
      </div>
    </div>
  )
}
