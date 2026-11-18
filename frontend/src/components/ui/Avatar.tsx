import { useState } from 'react'
import { assetUrl } from '../../lib/url'
import { initials } from '../../lib/format'

export function Avatar({ name, photoUrl, size = 40 }: { name: string; photoUrl?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false)
  const src = assetUrl(photoUrl)
  const style = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    objectFit: 'cover' as const,
    border: '2px solid rgba(255,255,255,0.25)',
  }
  if (src && !failed) {
    return <img src={src} alt={name} style={style} onError={() => setFailed(true)} referrerPolicy="no-referrer" />
  }
  return (
    <span
      aria-label={name}
      style={{
        ...style,
        display: 'grid',
        placeItems: 'center',
        fontWeight: 700,
        fontSize: size * 0.38,
        color: '#fff',
        background: 'linear-gradient(135deg,#7c5cff,#a855f7)',
      }}
    >
      {initials(name) || '?'}
    </span>
  )
}
