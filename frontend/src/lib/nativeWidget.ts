import { Capacitor, registerPlugin } from '@capacitor/core'

/**
 * Bridge to the native home-screen QR widget in the Quiree Android app (mobile/android, QrWidgetPlugin.java).
 * Websites can't create home-screen widgets, so everything here is a no-op outside the app.
 */
export interface WidgetQr {
  /** What the QR encodes (the permanent personal URL or the business /bq/{code} URL). */
  url: string
  /** Shown under the QR, e.g. the person's or business's name. */
  title: string
  subtitle?: string
  /** Page on this site opened when the widget is tapped, e.g. /q/your-name. */
  openPath?: string
}

interface QrWidgetPlugin {
  setQr(qr: WidgetQr): Promise<{ placedWidgets: number }>
  getQr(): Promise<{ url: string | null; title: string | null; placedWidgets: number; pinSupported: boolean }>
  requestPin(): Promise<{ requested: boolean }>
  clear(): Promise<void>
}

const QrWidget = registerPlugin<QrWidgetPlugin>('QrWidget')

/** True only inside the Quiree app (Android), where the widget exists. */
export const widgetSupported = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('QrWidget')

export async function getWidgetState() {
  if (!widgetSupported()) return null
  return QrWidget.getQr()
}

/**
 * Shows this QR on the home-screen widget. When no widget is placed yet, asks the launcher to add one.
 * Returns what happened so the page can show the right message.
 */
export async function showOnWidget(qr: WidgetQr): Promise<'updated' | 'pin-requested' | 'add-manually'> {
  const { placedWidgets } = await QrWidget.setQr(qr)
  if (placedWidgets > 0) return 'updated'
  const { requested } = await QrWidget.requestPin()
  return requested ? 'pin-requested' : 'add-manually'
}

/** Removes the QR from the widget (on sign-out, so a shared phone doesn't keep showing it). */
export async function clearWidget() {
  if (!widgetSupported()) return
  try {
    await QrWidget.clear()
  } catch {
    /* the widget is optional; never block sign-out */
  }
}
