import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Captured as early as possible: browsers fire this once, possibly before React mounts the page.
let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    listeners.forEach((l) => l())
  })
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // iPadOS 13+ reports itself as Mac; detect touch support to tell them apart.
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export type InstallSupport = 'prompt' | 'ios' | 'manual' | 'installed'

/** Exposes the best available "Add to Home Screen" path for the current browser. */
export function useInstallPrompt() {
  const [, force] = useState(0)

  useEffect(() => {
    const update = () => force((n) => n + 1)
    listeners.add(update)
    return () => {
      listeners.delete(update)
    }
  }, [])

  const support: InstallSupport = isStandalone() ? 'installed' : deferredPrompt ? 'prompt' : isIos() ? 'ios' : 'manual'

  async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferredPrompt) return 'unavailable'
    const event = deferredPrompt
    await event.prompt()
    const { outcome } = await event.userChoice
    deferredPrompt = null
    force((n) => n + 1)
    return outcome
  }

  return { support, promptInstall }
}

/**
 * Points the document at the per-profile manifest (start_url = the permanent profile URL)
 * and registers the service worker. Cleans up when leaving the public profile.
 */
export function usePublicProfilePwa(manifestHref: string | null, appTitle: string) {
  useEffect(() => {
    if (!manifestHref) return
    const created: HTMLElement[] = []
    const upsert = (selector: string, create: () => HTMLElement) => {
      const existing = document.head.querySelector(selector)
      if (existing) existing.remove()
      const el = create()
      document.head.appendChild(el)
      created.push(el)
    }
    upsert('link[rel="manifest"]', () => Object.assign(document.createElement('link'), { rel: 'manifest', href: manifestHref }))
    upsert('meta[name="apple-mobile-web-app-title"]', () =>
      Object.assign(document.createElement('meta'), { name: 'apple-mobile-web-app-title', content: appTitle }),
    )

    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        /* PWA features are progressive - the profile works without them */
      })
    }
    return () => created.forEach((el) => el.remove())
  }, [manifestHref, appTitle])
}

export type BrowserKind = 'ios' | 'in-app' | 'samsung' | 'chrome' | 'other'

/** Which "Add to Home Screen" instructions apply. In-app viewers (QR scanners, social apps) cannot install at all. */
export function detectBrowser(ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): BrowserKind {
  if (/; wv\)|FBAN|FBAV|Instagram|Line\/|GSA\/|WhatsApp|MicroMessenger|Snapchat/i.test(ua)) return 'in-app'
  if (isIos()) return 'ios'
  if (/SamsungBrowser/i.test(ua)) return 'samsung'
  if (/Android/i.test(ua) && /Chrome\//i.test(ua)) return 'chrome'
  return 'other'
}
