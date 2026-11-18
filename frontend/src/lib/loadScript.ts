const pending = new Map<string, Promise<void>>()

/** Loads an external script once (Razorpay checkout, Google Identity Services). */
export function loadScript(src: string): Promise<void> {
  const existing = pending.get(src)
  if (existing) return existing

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      pending.delete(src)
      script.remove()
      reject(new Error(`Failed to load ${src}`))
    }
    document.head.appendChild(script)
  })
  pending.set(src, promise)
  return promise
}
