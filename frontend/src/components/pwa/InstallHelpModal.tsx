import { Copy } from 'lucide-react'
import { detectBrowser } from '../../lib/pwa'
import { copyToClipboard } from '../../lib/share'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Surface'
import { useToast } from '../ui/Toast'
import styles from './InstallHelpModal.module.scss'

/**
 * Shown when the browser hasn't offered its one-tap install (iOS never does; Chrome only after some
 * interaction; QR-scanner and social-app viewers can't install at all).
 */
export function InstallHelpModal({ open, onClose, link }: { open: boolean; onClose: () => void; link: string }) {
  const toast = useToast()
  const browser = detectBrowser()

  return (
    <Modal open={open} title="Add to Home Screen" size="sm" onClose={onClose}>
      {browser === 'in-app' ? (
        <>
          <p className={styles.lead}>This page opened inside another app’s viewer, which can’t add icons to your home screen.</p>
          <ol className={styles.steps}>
            <li>
              Tap the menu (<strong>⋮</strong> or <strong>↗</strong>) and choose <strong>Open in Chrome</strong> / <strong>Open in browser</strong>.
              Or copy the link below and paste it into Chrome.
            </li>
            <li>
              Tap <strong>Add to Home Screen</strong> again there.
            </li>
          </ol>
          <Button
            variant="secondary"
            size="sm"
            icon={<Copy />}
            onClick={async () => (await copyToClipboard(link)) && toast.success('Link copied. Paste it into Chrome.')}
          >
            Copy link
          </Button>
        </>
      ) : browser === 'ios' ? (
        <ol className={styles.steps}>
          <li>
            Tap the <strong>Share</strong> button (square with ↑) in Safari.
          </li>
          <li>
            Scroll down and choose <strong>Add to Home Screen</strong>.
          </li>
          <li>
            Tap <strong>Add</strong>.
          </li>
        </ol>
      ) : browser === 'samsung' ? (
        <ol className={styles.steps}>
          <li>
            Tap the menu <strong>≡</strong> at the bottom right.
          </li>
          <li>
            Choose <strong>Add page to</strong> → <strong>Home screen</strong>, then <strong>Add</strong>.
          </li>
        </ol>
      ) : browser === 'chrome' ? (
        <ol className={styles.steps}>
          <li>
            Tap the menu <strong>⋮</strong> at the top right.
          </li>
          <li>
            Choose <strong>Add to Home screen</strong>, then <strong>Install</strong> (not “Create shortcut”).
          </li>
          <li>
            Tap <strong>Install</strong> / <strong>Add</strong> to confirm.
          </li>
        </ol>
      ) : (
        <ol className={styles.steps}>
          <li>Open your browser menu (⋮ or ⋯).</li>
          <li>
            Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>, then confirm.
          </li>
        </ol>
      )}
      {browser === 'chrome' && (
        <p className={styles.note}>Tip: after you’ve used the page for a few seconds, Chrome lets this button install in one tap.</p>
      )}
    </Modal>
  )
}
