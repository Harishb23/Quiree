import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowRight, LayoutDashboard, Mail, MapPin, Menu, Phone, X } from 'lucide-react'
import { Logo } from '../components/ui/Logo'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { config } from '../config'
import { company, footerLinks } from '../content/siteContent'
import styles from './PublicLayout.module.scss'

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/features', label: 'Features' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/contact', label: 'Contact' },
]

export default function PublicLayout() {
  const { status } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Scroll to top (or to a hash anchor) on navigation and close the mobile menu.
  useEffect(() => {
    setMenuOpen(false)
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1))
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
    window.scrollTo(0, 0)
  }, [location.pathname, location.hash])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const authenticated = status === 'authenticated'

  const actions = authenticated ? (
    <Button to="/dashboard" size="sm" icon={<LayoutDashboard />}>
      Dashboard
    </Button>
  ) : (
    <>
      <Button to="/login" variant="secondary" size="sm">
        Login
      </Button>
      <Button to="/register" size="sm">
        Get Started
      </Button>
    </>
  )

  return (
    <div className={`app-dark-bg ${styles.shell}`}>
      <header className={[styles.header, scrolled && styles.scrolled].filter(Boolean).join(' ')}>
        <div className={styles.headerInner}>
          <Logo />
          <nav className={styles.desktopNav} aria-label="Main">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => [styles.navLink, isActive && styles.active].filter(Boolean).join(' ')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className={styles.desktopActions}>{actions}</div>
          <button
            type="button"
            className={styles.menuButton}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <div id="mobile-menu" className={styles.mobileMenu}>
            <nav aria-label="Mobile">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => [styles.mobileLink, isActive && styles.active].filter(Boolean).join(' ')}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className={styles.mobileActions}>{actions}</div>
          </div>
        )}
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Logo />
            <p>One identity. Many roles. Share every professional side of you with a single, permanent QR code.</p>
            <Button to={authenticated ? '/dashboard' : '/register'} size="sm" iconRight={<ArrowRight />}>
              {authenticated ? 'Go to Dashboard' : 'Create your profile'}
            </Button>
          </div>
          <div className={styles.footerCol}>
            <h4>Product</h4>
            {footerLinks.product.map((l) => (
              <Link key={l.label} to={l.to}>
                {l.label}
              </Link>
            ))}
          </div>
          <div className={styles.footerCol}>
            <h4>Company</h4>
            {footerLinks.company.map((l) => (
              <Link key={l.label} to={l.to}>
                {l.label}
              </Link>
            ))}
          </div>
          <div className={styles.footerCol}>
            <h4>Contact</h4>
            <a href={`mailto:${company.email}`}>
              <Mail size={15} /> {company.email}
            </a>
            <a href={`tel:${company.phone.replace(/[^\d+]/g, '')}`}>
              <Phone size={15} /> {company.phone}
            </a>
            <span>
              <MapPin size={15} /> {company.address}
            </span>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>
            © {new Date().getFullYear()} {config.appName}. All rights reserved.
          </span>
          <span>Made for professionals who wear many hats.</span>
        </div>
      </footer>
    </div>
  )
}
