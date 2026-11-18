import { Link } from 'react-router-dom'
import { config } from '../../config'

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="plg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6b3fa0" />
          <stop offset="1" stopColor="#452269" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#plg)" />
      <path
        d="M23 46V18h11.5c6.4 0 10.5 3.9 10.5 9.6S40.9 37 34.5 37H30v9h-7zm7-15h4.1c2.6 0 4-1.3 4-3.4s-1.4-3.4-4-3.4H30V31z"
        fill="#fff"
      />
      <circle cx="49" cy="15" r="4" fill="#d4a94f" />
    </svg>
  )
}

export function Logo({ to = '/', size = 30, compact = false }: { to?: string; size?: number; compact?: boolean }) {
  return (
    <Link
      to={to}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        fontWeight: 800,
        fontSize: size * 0.62,
        letterSpacing: '-0.02em',
        color: 'var(--q-purple-deep)',
      }}
      aria-label={`${config.appName} home`}
    >
      <LogoMark size={size} />
      {!compact && <span>{config.appName}</span>}
    </Link>
  )
}
