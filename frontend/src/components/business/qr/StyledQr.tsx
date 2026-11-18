import { forwardRef, useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { assetUrl } from '../../../lib/url'

export interface StyledQrProps {
  /** What the code encodes (the campaign's /bq/{code} URL). */
  url: string
  foregroundColor: string
  backgroundColor: string
  /** Business logo shown in the centre (uses high error correction so the code still scans). */
  logoUrl?: string | null
  showLogo?: boolean
  /** Caption under the code, e.g. "Scan for menu". */
  frameText?: string | null
  /** Small label above the caption, e.g. the campaign name ("Table 4"). */
  label?: string | null
  className?: string
}

const QR = 600
const PAD = 48
const CAPTION = 92

/**
 * Campaign QR code as an SVG (exportable with svgToPng). The logo is inlined as a data URL because browsers
 * don't load external images when an SVG is rasterised, which would leave a blank hole in downloads.
 */
export const StyledQr = forwardRef<SVGSVGElement, StyledQrProps>(function StyledQr(
  { url, foregroundColor, backgroundColor, logoUrl, showLogo = true, frameText, label, className },
  ref,
) {
  const logoSrc = showLogo ? assetUrl(logoUrl) : undefined
  const logo = useDataUrl(logoSrc)
  const withLogo = Boolean(logo)

  const matrix = useMemo(() => {
    const { modules } = QRCode.create(url, { errorCorrectionLevel: withLogo ? 'H' : 'Q' })
    return modules
  }, [url, withLogo])

  const n = matrix.size
  const m = QR / n
  const hasCaption = Boolean(frameText || label)
  const width = QR + PAD * 2
  const height = QR + PAD * 2 + (hasCaption ? CAPTION : 0)

  // Clear a square in the centre (about 22% of the code) for the logo.
  const logoModules = Math.round(n * 0.22) | 1
  const logoStart = (n - logoModules) / 2
  const inLogo = (r: number, c: number) =>
    withLogo && r >= logoStart - 1 && r < logoStart + logoModules + 1 && c >= logoStart - 1 && c < logoStart + logoModules + 1

  let path = ''
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) if (matrix.get(r, c) && !inLogo(r, c)) path += `M${PAD + c * m},${PAD + r * m}h${m}v${m}h${-m}z`

  return (
    <svg
      ref={ref}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label ? `QR code: ${label}` : 'QR code'}
    >
      <rect width={width} height={height} rx="36" fill={backgroundColor} />
      <path d={path} fill={foregroundColor} shapeRendering="crispEdges" />
      {withLogo && (
        <g>
          <rect
            x={PAD + logoStart * m - m * 0.4}
            y={PAD + logoStart * m - m * 0.4}
            width={logoModules * m + m * 0.8}
            height={logoModules * m + m * 0.8}
            rx={m * 1.4}
            fill={backgroundColor}
          />
          <image
            href={logo!}
            x={PAD + logoStart * m}
            y={PAD + logoStart * m}
            width={logoModules * m}
            height={logoModules * m}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      )}
      {hasCaption && (
        <g fill={foregroundColor} fontFamily="Inter, 'Segoe UI', Arial, sans-serif" textAnchor="middle">
          {label && (
            <text x={width / 2} y={QR + PAD * 2 + (frameText ? 18 : 40)} fontSize="30" fontWeight="600" opacity="0.75">
              {label}
            </text>
          )}
          {frameText && (
            <text x={width / 2} y={QR + PAD * 2 + (label ? 62 : 46)} fontSize="40" fontWeight="800">
              {frameText}
            </text>
          )}
        </g>
      )}
    </svg>
  )
})

/** Fetches an image and returns it as a data URL (null while loading or on failure). */
function useDataUrl(src: string | undefined): string | null {
  const [data, setData] = useState<string | null>(null)
  useEffect(() => {
    setData(null)
    if (!src) return
    let cancelled = false
    fetch(src)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(blob)
          }),
      )
      .then((url) => !cancelled && setData(url))
      .catch(() => !cancelled && setData(null))
    return () => {
      cancelled = true
    }
  }, [src])
  return data
}
