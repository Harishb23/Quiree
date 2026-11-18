const KEY = 'prolink.auth.token'

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export const tokenStorage = {
  get: (): string | null => safe(() => localStorage.getItem(KEY), null),
  set: (token: string) => safe(() => localStorage.setItem(KEY, token), undefined),
  clear: () => safe(() => localStorage.removeItem(KEY), undefined),
}
