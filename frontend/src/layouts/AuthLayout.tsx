import { Outlet } from 'react-router-dom'
import { BadgeCheck, QrCode, Layers } from 'lucide-react'
import { Logo } from '../components/ui/Logo'
import styles from './AuthLayout.module.scss'

export default function AuthLayout() {
  return (
    <div className={`${styles.page} app-bg`}>
      <aside className={styles.brandPanel}>
        <Logo />
        <div className={styles.pitch}>
          <span className={styles.pill}>One Identity. Many Roles.</span>
          <h2>Every professional side of you, behind one permanent QR code.</h2>
          <ul>
            <li>
              <Layers /> Multiple professional modes under one account
            </li>
            <li>
              <QrCode /> A QR code that never changes, whatever you update
            </li>
            <li>
              <BadgeCheck /> Resume-grade templates viewers can save in one tap
            </li>
          </ul>
        </div>
        <span className={styles.glowA} aria-hidden />
        <span className={styles.glowB} aria-hidden />
      </aside>
      <main className={styles.formPanel}>
        <div className={styles.mobileLogo}>
          <Logo />
        </div>
        <div className={styles.card}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
