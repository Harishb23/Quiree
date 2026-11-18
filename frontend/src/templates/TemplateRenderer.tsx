import { useEffect, useRef, useState } from 'react'
import { getTemplate } from './registry'
import { ProfileCard } from '../cards/ProfileCard'
import type { TemplateProps } from './types'
import styles from './TemplateRenderer.module.scss'

/** Dynamically renders the resume template selected for a mode. */
export function TemplateRenderer({ templateKey, ...props }: TemplateProps & { templateKey?: string | null }) {
  const { component: Component, key } = getTemplate(templateKey ?? props.mode.templateKey)
  return (
    <div data-template={key} className={styles.root}>
      <Component {...props} />
    </div>
  )
}

/**
 * Miniature, non-interactive live preview of a template's mobile profile card (what viewers see after scanning),
 * rendered at phone width and scaled to fit. Used by the template gallery and the marketing showcase.
 */
export function TemplateThumbnail({
  templateKey,
  renderWidth = 440,
  height = 300,
  ...props
}: TemplateProps & { templateKey: string; renderWidth?: number; height?: number }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const update = () => setScale(el.clientWidth / renderWidth || 0.5)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [renderWidth])

  return (
    <div ref={frameRef} className={styles.thumbFrame} style={{ height }} aria-hidden inert>
      <div className={styles.thumbInner} style={{ width: renderWidth, transform: `scale(${scale})` }}>
        <ProfileCard
          fullName={props.fullName}
          photoUrl={props.photoUrl}
          permanentUrl={props.permanentUrl}
          mode={props.mode}
          templateKey={templateKey}
          compact
        />
      </div>
    </div>
  )
}
