import { useEffect, useState } from 'react'
import { CheckCircle2, LayoutGrid } from 'lucide-react'
import { Button } from '../ui/Button'
import { CardHeader, GlassCard } from '../ui/Surface'
import { useToast } from '../ui/Toast'
import { getErrorMessage } from '../../api/client'
import { getWidgetState, showOnWidget, widgetSupported, type WidgetQr } from '../../lib/nativeWidget'
import styles from './HomeWidgetCard.module.scss'

/**
 * "Add QR widget to home screen" — only rendered inside the Quiree Android app, where a real
 * home-screen widget exists. On the website it renders nothing.
 */
export function HomeWidgetCard({ qr }: { qr: WidgetQr }) {
  const toast = useToast()
  const [state, setState] = useState<{ showing: boolean; placed: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [manualHelp, setManualHelp] = useState(false)

  useEffect(() => {
    let cancelled = false
    getWidgetState()
      .then((s) => !cancelled && s && setState({ showing: s.url === qr.url, placed: s.placedWidgets }))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [qr.url])

  if (!widgetSupported()) return null

  async function add() {
    setBusy(true)
    try {
      const result = await showOnWidget(qr)
      setState((s) => ({ showing: true, placed: s?.placed ?? 0 }))
      if (result === 'updated') toast.success('Your home-screen widget now shows this QR code.')
      else if (result === 'pin-requested') toast.info('Confirm “Add” to place the QR widget on your home screen.')
      else setManualHelp(true)
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not update the widget.'))
    } finally {
      setBusy(false)
    }
  }

  const showing = state?.showing && (state.placed ?? 0) > 0

  return (
    <GlassCard>
      <CardHeader
        title="Home-screen widget"
        subtitle="Keep this QR on your phone’s home screen, ready to scan — it works even offline."
      />
      {showing ? (
        <p className={styles.done}>
          <CheckCircle2 aria-hidden /> Your widget is showing this QR code.
        </p>
      ) : null}
      <Button icon={<LayoutGrid />} loading={busy} onClick={add} variant={showing ? 'secondary' : 'primary'}>
        {showing ? 'Update widget' : state?.placed ? 'Show this QR on my widget' : 'Add QR widget to home screen'}
      </Button>
      {manualHelp && (
        <ol className={styles.steps}>
          <li>Long-press an empty spot on your home screen.</li>
          <li>Tap <strong>Widgets</strong> and find <strong>Quiree</strong>.</li>
          <li>Drag the <strong>Quiree QR</strong> widget onto your home screen — it shows this QR code.</li>
        </ol>
      )}
    </GlassCard>
  )
}
