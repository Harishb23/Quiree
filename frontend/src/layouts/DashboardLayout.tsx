import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  ExternalLink,
  Images,
  Inbox,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Menu,
  Package,
  QrCode,
  Settings,
  Star,
  Store,
  Tag,
  UserRound,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Logo } from '../components/ui/Logo'
import { Avatar } from '../components/ui/Avatar'
import { businessApi } from '../api/businessApi'
import { hasRole } from '../lib/business'
import { homeFor } from '../lib/accounts'
import type { BusinessRole, BusinessSummary } from '../types/business'
import styles from './DashboardLayout.module.scss'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  minRole?: BusinessRole
}

const personalNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/profile', label: 'My Profile', icon: UserRound },
  { to: '/dashboard/modes', label: 'Profile Modes', icon: Layers },
  { to: '/dashboard/templates', label: 'Templates', icon: LayoutTemplate },
  { to: '/dashboard/qr', label: 'QR Code', icon: QrCode },
  { to: '/dashboard/subscription', label: 'Subscription', icon: CreditCard },
  { to: '/dashboard/settings', label: 'Account Settings', icon: Settings },
]

const businessNav = (id: string): NavItem[] => {
  const base = `/dashboard/business/${id}`
  return [
    { to: base, label: 'Overview', icon: LayoutDashboard, end: true },
    { to: `${base}/profile`, label: 'Business Profile', icon: Store, minRole: 'Manager' },
    { to: `${base}/products`, label: 'Products', icon: Package },
    { to: `${base}/services`, label: 'Services', icon: Wrench },
    { to: `${base}/offers`, label: 'Offers', icon: Tag },
    { to: `${base}/gallery`, label: 'Gallery', icon: Images },
    { to: `${base}/qr`, label: 'QR Code', icon: QrCode },
    { to: `${base}/analytics`, label: 'Analytics', icon: BarChart3 },
    { to: `${base}/enquiries`, label: 'Enquiries', icon: Inbox, minRole: 'Manager' },
    { to: `${base}/reviews`, label: 'Reviews', icon: Star },
    { to: `${base}/settings`, label: 'Business Settings', icon: Settings },
  ]
}

const COLLAPSE_KEY = 'quiree.sidebarCollapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

/** Title of the section the current route belongs to (longest matching nav prefix). */
function sectionTitle(pathname: string, items: NavItem[], fallback: string) {
  const match = items
    .filter((n) => (n.end ? pathname === n.to || pathname === `${n.to}/` : pathname.startsWith(n.to)))
    .sort((a, b) => b.to.length - a.to.length)[0]
  return match?.label ?? fallback
}

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)

  const businessMatch = useMatch('/dashboard/business/:businessId/*')
  const businessId = businessMatch?.params.businessId && businessMatch.params.businessId !== 'new' ? businessMatch.params.businessId : null
  // Business accounts only ever see the business area; personal accounts only the personal one.
  const inBusinessArea = user?.accountType === 'Business'

  // The business list powers the switcher and tells us the user's role for nav filtering.
  const [businesses, setBusinesses] = useState<BusinessSummary[] | null>(null)
  useEffect(() => {
    if (!inBusinessArea) return
    let cancelled = false
    businessApi
      .mine()
      .then((list) => !cancelled && setBusinesses(list))
      .catch(() => !cancelled && setBusinesses([]))
    return () => {
      cancelled = true
    }
    // Refresh when moving between businesses (e.g. after creating one).
  }, [inBusinessArea, businessId])

  const current = businesses?.find((b) => b.id === businessId) ?? null
  const items = useMemo(() => {
    if (!businessId) return personalNav
    const role = current?.myRole
    return businessNav(businessId).filter((n) => !n.minRole || !role || hasRole(role, n.minRole))
  }, [businessId, current?.myRole])

  useEffect(() => setOpen(false), [location.pathname])

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* storage unavailable — preference just isn't remembered */
    }
  }, [collapsed])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const shellClass = [styles.shell, collapsed && styles.collapsed, 'app-bg'].filter(Boolean).join(' ')
  const title = businessId
    ? sectionTitle(location.pathname, items, 'Business')
    : location.pathname.startsWith('/dashboard/business')
      ? location.pathname.endsWith('/new')
        ? 'New Business'
        : 'My Businesses'
      : sectionTitle(location.pathname, personalNav, 'Dashboard')

  const linkClass = ({ isActive }: { isActive: boolean }) => [styles.navLink, isActive && styles.active].filter(Boolean).join(' ')

  return (
    <div className={shellClass}>
      <aside className={[styles.sidebar, open && styles.sidebarOpen].filter(Boolean).join(' ')}>
        <div className={styles.sidebarHeader}>
          <span className={styles.logoFull}>
            <Logo to={homeFor(user?.accountType)} />
          </span>
          <span className={styles.logoCompact}>
            <Logo to={homeFor(user?.accountType)} compact />
          </span>
          <button type="button" className={[styles.iconButton, styles.closeButton].join(' ')} onClick={() => setOpen(false)} aria-label="Close menu">
            <X />
          </button>
        </div>

        {businessId && (
          <div className={styles.businessSwitcher}>
            <label htmlFor="business-switcher" className="sr-only">
              Current business
            </label>
            <select
              id="business-switcher"
              value={businessId}
              onChange={(e) => navigate(e.target.value === '__all' ? '/dashboard/business' : `/dashboard/business/${e.target.value}`)}
              title={current?.name}
            >
              {!current && <option value={businessId}>Loading…</option>}
              {businesses?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
              <option value="__all">All businesses…</option>
            </select>
          </div>
        )}

        <nav className={styles.nav} aria-label={businessId ? 'Business' : 'Dashboard'}>
          {inBusinessArea && !businessId ? (
            <NavLink to="/dashboard/business" end className={linkClass} title={collapsed ? 'My businesses' : undefined}>
              <Store />
              <span className={styles.navLabel}>My Businesses</span>
            </NavLink>
          ) : (
            items.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} title={collapsed ? label : undefined} className={linkClass}>
                <Icon />
                <span className={styles.navLabel}>{label}</span>
              </NavLink>
            ))
          )}
        </nav>
        <div className={styles.sidebarFooter}>
          {businessId && current?.status === 'Published' ? (
            <a href={`/business/${current.slug}`} target="_blank" rel="noopener noreferrer" className={styles.publicLink} title={collapsed ? 'View storefront' : undefined}>
              <ExternalLink />
              <span className={styles.navLabel}>View storefront</span>
            </a>
          ) : (
            !inBusinessArea &&
            user && (
              <a
                href={`/p/${user.publicSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.publicLink}
                title={collapsed ? 'View public profile' : undefined}
              >
                <ExternalLink />
                <span className={styles.navLabel}>View public profile</span>
              </a>
            )
          )}
          <button type="button" className={styles.navLink} onClick={onLogout} title={collapsed ? 'Log out' : undefined}>
            <LogOut />
            <span className={styles.navLabel}>Log out</span>
          </button>
          <button
            type="button"
            className={[styles.navLink, styles.collapseToggle].join(' ')}
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : undefined}
          >
            {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
            <span className={styles.navLabel}>Collapse</span>
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
          <div className={styles.topbarTitles}>
            {businessId && current && <span className={styles.topbarEyebrow}>{current.name}</span>}
            <span className={styles.topbarTitle}>{title}</span>
          </div>
          <div className={styles.spacer} />
          {user && (
            <div className={styles.userChip}>
              <Avatar name={user.fullName} photoUrl={user.photoUrl} size={36} />
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
