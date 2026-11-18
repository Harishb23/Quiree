import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  CreditCard,
  ExternalLink,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Menu,
  QrCode,
  Settings,
  UserRound,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Logo } from '../components/ui/Logo'
import { Avatar } from '../components/ui/Avatar'
import styles from './DashboardLayout.module.scss'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/profile', label: 'My Profile', icon: UserRound },
  { to: '/dashboard/modes', label: 'Profile Modes', icon: Layers },
  { to: '/dashboard/templates', label: 'Templates', icon: LayoutTemplate },
  { to: '/dashboard/qr', label: 'QR Code', icon: QrCode },
  { to: '/dashboard/subscription', label: 'Subscription', icon: CreditCard },
  { to: '/dashboard/settings', label: 'Account Settings', icon: Settings },
]

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [location.pathname])

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={`${styles.shell} app-dark-bg`}>
      <aside className={[styles.sidebar, open && styles.sidebarOpen].filter(Boolean).join(' ')}>
        <div className={styles.sidebarHeader}>
          <Logo to="/dashboard" />
          <button type="button" className={styles.iconButton} onClick={() => setOpen(false)} aria-label="Close menu">
            <X />
          </button>
        </div>
        <nav className={styles.nav} aria-label="Dashboard">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => [styles.navLink, isActive && styles.active].filter(Boolean).join(' ')}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          {user && (
            <a href={`/p/${user.publicSlug}`} target="_blank" rel="noopener noreferrer" className={styles.publicLink}>
              <ExternalLink />
              <span>View public profile</span>
            </a>
          )}
          <button type="button" className={styles.navLink} onClick={onLogout}>
            <LogOut />
            <span>Log out</span>
          </button>
        </div>
      </aside>
      {open && <div className={styles.scrim} onClick={() => setOpen(false)} aria-hidden />}

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={[styles.iconButton, styles.menuButton].join(' ')}
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu />
          </button>
          <div className={styles.spacer} />
          {user && (
            <div className={styles.userChip}>
              <Avatar name={user.fullName} photoUrl={user.photoUrl} size={34} />
              <div className={styles.userText}>
                <strong>{user.fullName}</strong>
                <span>{user.email}</span>
              </div>
            </div>
          )}
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
