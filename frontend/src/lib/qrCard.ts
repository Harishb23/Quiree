/**
 * Converts a rendered SVG (the branded QR card) into a PNG, e.g. for a phone's Photo widget,
 * lock-screen wallpaper or printing.
 */
export async function svgToPng(svg: SVGSVGElement, width = 1080): Promise<Blob> {
  const { width: vbWidth, height: vbHeight } = svg.viewBox.baseVal
  const height = Math.round((width * vbHeight) / vbWidth)
  const markup = new XMLSerializer().serializeToString(svg)
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }))

  try {
    const image = new Image()
    image.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Could not render the QR image.'))
      image.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Your browser cannot create images.')
    ctx.drawImage(image, 0, 0, width, height)

    return await new Promise((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create the image.'))), 'image/png'),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
