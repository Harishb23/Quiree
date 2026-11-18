import { forwardRef, useId, useMemo } from 'react'
import QRCode from 'qrcode'

interface BrandedQrProps {
  /** The permanent profile URL the QR opens. */
  url: string
  brand: string
  className?: string
}

const FONT = "'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif"

// Card layout in SVG units; the SVG scales to any size.
const MARGIN = 40
const HEADER = 150
const BORDER = 20
const QUIET = 72
const QR_PX = 660
const BAND = 170
const FRAME_W = QR_PX + 2 * QUIET + 2 * BORDER
const FRAME_H = QR_PX + 2 * QUIET + BORDER + BAND
const WIDTH = FRAME_W + 2 * MARGIN
const HEIGHT = MARGIN + HEADER + FRAME_H + MARGIN

/**
 * Branded "Scan to Open" QR card: brand header, gradient frame, rounded modules, gradient finder eyes
 * and the brand logo in the centre.
 */
export const BrandedQr = forwardRef<SVGSVGElement, BrandedQrProps>(function BrandedQr({ url, brand, className }, ref) {
  const ids = useGradientIds()
  const headerLogo = 104
  const bandY = MARGIN + HEADER + FRAME_H - BAND

  return (
    <svg
      ref={ref}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`QR code: scan to open ${brand}`}
    >
      <Gradients ids={ids} />
      <rect width={WIDTH} height={HEIGHT} rx="56" fill={`url(#${ids.bg})`} />

      {/* Header: logo + brand name */}
      <g transform={`translate(${WIDTH / 2}, ${MARGIN + HEADER / 2 - 10})`}>
        <BrandMark x={-160 - headerLogo / 2} y={-headerLogo / 2} size={headerLogo} gradient={ids.logo} brand={brand} />
        <text x={-160 + headerLogo / 2 + 22} y="26" fontFamily={FONT} fontSize="78" fontWeight="800" fill="#452269">
          {brand}
        </text>
      </g>

      {/* Gradient frame with white QR panel */}
      <rect x={MARGIN} y={MARGIN + HEADER} width={FRAME_W} height={FRAME_H} rx="70" fill={`url(#${ids.frame})`} />
      <rect
        x={MARGIN + BORDER}
        y={MARGIN + HEADER + BORDER}
        width={QR_PX + 2 * QUIET}
        height={QR_PX + 2 * QUIET}
        rx="52"
        fill="#ffffff"
      />
      <QrMatrix url={url} brand={brand} x={MARGIN + BORDER + QUIET} y={MARGIN + HEADER + BORDER + QUIET} size={QR_PX} ids={ids} />

      {/* Bottom band */}
      <g transform={`translate(${WIDTH / 2}, ${bandY + BAND / 2})`} fill="#ffffff">
        <ScanIcon x={-290} y={-34} />
        <text x="40" y="-10" textAnchor="middle" fontFamily={FONT} fontSize="50" fontWeight="800">
          Scan to Open
        </text>
        <text x="40" y="50" textAnchor="middle" fontFamily={FONT} fontSize="56" fontWeight="800" fill="#d4a94f">
          {brand}
        </text>
      </g>
    </svg>
  )
})

// Tile layout: a square-ish white widget tile (QR + "Scan to open {brand}").
const TILE_PAD = 96
const TILE_QR = 800
const TILE_W = TILE_QR + 2 * TILE_PAD
const TILE_H = TILE_W + 90

/** Compact white tile for a phone's Photo widget, like a home-screen QR widget. */
export const BrandedQrTile = forwardRef<SVGSVGElement, BrandedQrProps>(function BrandedQrTile({ url, brand, className }, ref) {
  const ids = useGradientIds()
  return (
    <svg
      ref={ref}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${TILE_W} ${TILE_H}`}
      role="img"
      aria-label={`QR widget: scan to open ${brand}`}
    >
      <Gradients ids={ids} />
      <rect width={TILE_W} height={TILE_H} rx="90" fill="#ffffff" />
      <QrMatrix url={url} brand={brand} x={TILE_PAD} y={TILE_PAD} size={TILE_QR} ids={ids} />
      <text x={TILE_W / 2} y={TILE_W + 20} textAnchor="middle" fontFamily={FONT} fontSize="64" fontWeight="800" fill="#452269">
        Scan to open {brand}
      </text>
    </svg>
  )
})

type GradientIds = ReturnType<typeof useGradientIds>

function useGradientIds() {
  const uid = useId().replace(/:/g, '')
  return { bg: `qrb${uid}`, frame: `qrf${uid}`, eye: `qre${uid}`, logo: `qrl${uid}` }
}

function Gradients({ ids }: { ids: GradientIds }) {
  return (
    <defs>
      <linearGradient id={ids.bg} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#f1ecfa" />
      </linearGradient>
      <linearGradient id={ids.frame} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#7c4db1" />
        <stop offset="0.5" stopColor="#6b3fa0" />
        <stop offset="1" stopColor="#452269" />
      </linearGradient>
      <linearGradient id={ids.eye} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6b3fa0" />
        <stop offset="1" stopColor="#452269" />
      </linearGradient>
      <linearGradient id={ids.logo} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6b3fa0" />
        <stop offset="1" stopColor="#452269" />
      </linearGradient>
    </defs>
  )
}

/**
 * The scannable part: rounded data modules, gradient finder eyes and the centre logo.
 * Error correction H tolerates the centre logo (about 5% of the code) comfortably.
 * Needs a white quiet zone of at least 3 modules around it.
 */
function QrMatrix({ url, brand, x, y, size, ids }: { url: string; brand: string; x: number; y: number; size: number; ids: GradientIds }) {
  const matrix = useMemo(() => {
    const { modules } = QRCode.create(url, { errorCorrectionLevel: 'H' })
    return { size: modules.size, dark: (r: number, c: number) => modules.get(r, c) === 1 }
  }, [url])

  const n = matrix.size
  const m = size / n
  const logoModules = Math.round(n * 0.22) | 1 // odd, so it centres on a module
  const logoStart = (n - logoModules) / 2

  const inFinder = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7)
  const inLogo = (r: number, c: number) =>
    r >= logoStart - 1 && r < logoStart + logoModules + 1 && c >= logoStart - 1 && c < logoStart + logoModules + 1

  const modules: [number, number][] = []
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) if (matrix.dark(r, c) && !inFinder(r, c) && !inLogo(r, c)) modules.push([r, c])

  const eyes: [number, number][] = [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ]

  return (
    <g>
      <g fill="#30243d">
        {modules.map(([r, c]) => (
          <rect key={`${r}-${c}`} x={x + c * m} y={y + r * m} width={m} height={m} rx={m * 0.32} />
        ))}
      </g>
      {eyes.map(([r, c]) => (
        <g key={`eye-${r}-${c}`}>
          <rect
            x={x + c * m + m / 2}
            y={y + r * m + m / 2}
            width={6 * m}
            height={6 * m}
            rx={1.9 * m}
            fill="none"
            stroke={`url(#${ids.eye})`}
            strokeWidth={m}
          />
          <rect x={x + (c + 2) * m} y={y + (r + 2) * m} width={3 * m} height={3 * m} rx={0.9 * m} fill={`url(#${ids.eye})`} />
        </g>
      ))}
      <BrandMark x={x + logoStart * m} y={y + logoStart * m} size={logoModules * m} gradient={ids.logo} brand={brand} />
    </g>
  )
}

/** Brand logo tile; the "Q" glyph is drawn as a shape (same as the app icon), other brands use their initial. */
function BrandMark({ x, y, size, gradient, brand }: { x: number; y: number; size: number; gradient: string; brand: string }) {
  const initial = (brand.trim()[0] ?? 'Q').toUpperCase()
  return (
    <g>
      <rect x={x} y={y} width={size} height={size} rx={size * 0.26} fill={`url(#${gradient})`} />
      {initial === 'Q' ? (
        <g transform={`translate(${x}, ${y}) scale(${size / 512})`} fill="none" stroke="#ffffff" strokeLinecap="round">
          <circle cx="250" cy="244" r="118" strokeWidth="58" />
          <path d="M282 276 L390 384" strokeWidth="54" />
        </g>
      ) : (
        <text
          x={x + size / 2}
          y={y + size * 0.71}
          textAnchor="middle"
          fontFamily={FONT}
          fontSize={size * 0.62}
          fontWeight="800"
          fill="#ffffff"
        >
          {initial}
        </text>
      )}
    </g>
  )
}

/** Four rounded scan-corner brackets, 68×68. */
function ScanIcon({ x, y }: { x: number; y: number }) {
  return (
    <path
      transform={`translate(${x}, ${y})`}
      d="M2 22V12A10 10 0 0 1 12 2h10M46 2h10a10 10 0 0 1 10 10v10M66 46v10a10 10 0 0 1-10 10H46M22 66H12A10 10 0 0 1 2 56V46"
      fill="none"
      stroke="#ffffff"
      strokeWidth="6"
      strokeLinecap="round"
    />
  )
}
