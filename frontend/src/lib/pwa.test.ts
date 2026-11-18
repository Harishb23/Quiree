import { describe, expect, it } from 'vitest'
import { detectBrowser } from './pwa'

const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'

describe('detectBrowser', () => {
  it.each([
    ['Android Chrome', ANDROID_CHROME, 'chrome'],
    ['Samsung Internet', 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36', 'samsung'],
    ['QR scanner WebView', 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0 Mobile Safari/537.36', 'in-app'],
    ['Google app / Lens', `${ANDROID_CHROME} GSA/15.40.0`, 'in-app'],
    ['Instagram', `${ANDROID_CHROME} Instagram 350.0`, 'in-app'],
  ])('%s', (_name, ua, expected) => {
    expect(detectBrowser(ua)).toBe(expected)
  })
})
