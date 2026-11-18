import { useEffect, useState } from 'react'
import { qrApi } from '../api/endpoints'

/** Loads the owner's permanent QR (authenticated request) as an object URL for <img>. */
export function useQrImage(size = 600) {
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let url: string | null = null
    let cancelled = false
    qrApi
      .png(size)
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setSrc(url)
      })
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [size])

  return { src, error }
}
