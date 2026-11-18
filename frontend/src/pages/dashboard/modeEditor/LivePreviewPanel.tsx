import { useEffect, useRef, useState } from 'react'
import { Expand, IdCard, Monitor, ScrollText, Smartphone, Tablet, type LucideIcon } from 'lucide-react'
import { DeviceFrame } from '../../../components/preview/DeviceFrame'
import { ProfileCard } from '../../../cards/ProfileCard'
import { TemplateRenderer } from '../../../templates'
import type { PublicMode, PublicProfile } from '../../../types/api'
import styles from './LivePreviewPanel.module.scss'

type Device = 'mobile' | 'tablet' | 'desktop'
type View = 'card' | 'resume'

const DEVICES: Record<Device, { label: string; icon: LucideIcon; width: number; height: number }> = {
  mobile: { label: 'Mobile', icon: Smartphone, width: 390, height: 844 },
  tablet: { label: 'Tablet', icon: Tablet, width: 768, height: 1024 },
  desktop: { label: 'Desktop', icon: Monitor, width: 1280, height: 800 },
}

const VIEWS: { key: View; label: string; icon: LucideIcon }[] = [
  { key: 'card', label: 'Scan card', icon: IdCard },
  { key: 'resume', label: 'Full resume', icon: ScrollText },
]

/** Fits a fixed-size device into the available stage, never scaling up. */
function useFitScale(width: number, height: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const pad = 24
      const s = Math.min((el.clientWidth - pad) / width, (el.clientHeight - pad) / height, 1)
      setScale(Math.max(0.1, s))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [width, height])
  return { ref, scale }
}

/** Sticky side panel showing unsaved editor changes at a real phone, tablet or desktop resolution. */
export function LivePreviewPanel({
  profile,
  mode,
  templateKey,
  onExpand,
}: {
  profile: Pick<PublicProfile, 'fullName' | 'photoUrl' | 'permanentUrl'>
  mode: PublicMode
  templateKey: string
  onExpand?: () => void
}) {
  const [device, setDevice] = useState<Device>('mobile')
  const [view, setView] = useState<View>('card')
  const spec = DEVICES[device]
  const { ref, scale } = useFitScale(spec.width, spec.height)

  return (
    <aside className={styles.panel} aria-label="Live preview">
      <div className={styles.head}>
        <span className={styles.title}>Live preview</span>
        <div className={styles.segment} role="radiogroup" aria-label="Preview device">
          {(Object.keys(DEVICES) as Device[]).map((key) => {
            const { label, icon: Icon } = DEVICES[key]
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={device === key}
                className={device === key ? styles.active : undefined}
                onClick={() => setDevice(key)}
              >
                <Icon aria-hidden /> <span>{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className={styles.stage} ref={ref}>
        <div
          className={`${styles.device} ${styles[device]}`}
          style={{ width: spec.width * scale, height: spec.height * scale }}
        >
          <div className={styles.scaler} style={{ width: spec.width, height: spec.height, transform: `scale(${scale})` }}>
            <DeviceFrame width={spec.width} height={spec.height} title={`${spec.label} preview of ${mode.modeName}`}>
              {view === 'card' ? (
                <div className={styles.cardScreen}>
                  <ProfileCard
                    fullName={profile.fullName}
                    photoUrl={profile.photoUrl}
                    permanentUrl={profile.permanentUrl}
                    mode={mode}
                    templateKey={templateKey}
                  />
                </div>
              ) : (
                <TemplateRenderer
                  templateKey={templateKey}
                  fullName={profile.fullName}
                  photoUrl={profile.photoUrl}
                  permanentUrl={profile.permanentUrl}
                  mode={mode}
                />
              )}
            </DeviceFrame>
          </div>
        </div>
      </div>

      <div className={styles.foot}>
        <div className={styles.segment} role="radiogroup" aria-label="Preview screen">
          {VIEWS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={view === key}
              className={view === key ? styles.active : undefined}
              onClick={() => setView(key)}
            >
              <Icon aria-hidden /> <span>{label}</span>
            </button>
          ))}
        </div>
        {onExpand && (
          <button type="button" className={styles.expand} onClick={onExpand} aria-label="Open larger preview">
            <Expand aria-hidden />
          </button>
        )}
      </div>
      <p className={styles.note}>
        {spec.width} × {spec.height} · shows unsaved changes
      </p>
    </aside>
  )
}
