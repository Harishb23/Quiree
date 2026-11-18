import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowRight, LayoutDashboard, Mail, MapPin, Menu, Phone, X } from 'lucide-react'
import { Logo } from '../components/ui/Logo'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { config } from '../config'
import { company, footerLinks } from '../content/siteContent'
import { socialLinks } from '../content/landingContent'
import { BrandIcon, platformLabels } from '../components/ui/BrandIcon'
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
    <div className={`app-bg ${styles.shell}`}>
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
            <p>Your identity. Your business. One QR code. Personal and business digital profiles that never need reprinting.</p>
            <div className={styles.footerContact}>
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
            <ul className={styles.socials} aria-label="Social media">
              {socialLinks.map(({ platform, href }) => {
                const label = platformLabels[platform]
                return (
                  <li key={platform}>
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                        <BrandIcon platform={platform} size={16} />
                      </a>
                    ) : (
                      <span className={styles.socialSoon} title={`${label} — coming soon`}>
                        <BrandIcon platform={platform} size={16} />
                        <span className="sr-only">{label} (coming soon)</span>
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
            <Button to={authenticated ? '/dashboard' : '/register'} size="sm" iconRight={<ArrowRight />}>
              {authenticated ? 'Go to Dashboard' : 'Create your profile'}
            </Button>
          </div>
          {(
            [
              ['Product', footerLinks.product],
              ['Personal', footerLinks.personal],
              ['Business', footerLinks.business],
              ['Support', footerLinks.support],
            ] as const
          ).map(([heading, links]) => (
            <nav key={heading} className={styles.footerCol} aria-label={`${heading} links`}>
              <h4>{heading}</h4>
              {links.map((l) => (
                <Link key={l.label} to={l.to}>
                  {l.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        <div className={styles.footerBottom}>
          <span>
            © {new Date().getFullYear()} {config.appName}. All rights reserved.
          </span>
          <span className={styles.footerLegal}>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </span>
        </div>
      </footer>
    </div>
  )
}
