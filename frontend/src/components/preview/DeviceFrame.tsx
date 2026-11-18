import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const SRC_DOC =
  '<!doctype html><html lang="en"><head><meta charset="utf-8" />' +
  '<meta name="viewport" content="width=device-width, initial-scale=1" /></head>' +
  '<body><div id="preview-root"></div></body></html>'

const CLONE_ATTR = 'data-preview-clone'

/** Copies the app's stylesheets (incl. CSS modules and Vite HMR updates) into the iframe document. */
function syncStyles(target: Document) {
  target.head.querySelectorAll(`[${CLONE_ATTR}]`).forEach((n) => n.remove())
  document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    const clone = node.cloneNode(true) as HTMLElement
    clone.setAttribute(CLONE_ATTR, '')
    target.head.appendChild(clone)
  })
}

/**
 * Renders children inside an isolated iframe of an exact pixel size, so templates respond to *its*
 * width through their normal media queries — a true phone / tablet / desktop rendering. React content is
 * portalled in, so it updates live with the parent state.
 */
export function DeviceFrame({
  width,
  height,
  title,
  children,
}: {
  width: number
  height: number
  title: string
  children: ReactNode
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null)

  const onLoad = useCallback(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    syncStyles(doc)
    // Keep the preview inside the frame: links (tel:, mailto:, external) must not navigate it away.
    doc.addEventListener(
      'click',
      (e) => {
        if ((e.target as Element | null)?.closest?.('a[href]')) e.preventDefault()
      },
      true,
    )
    doc.addEventListener('submit', (e) => e.preventDefault(), true)
    setMountNode(doc.getElementById('preview-root'))
  }, [])

  // Re-copy styles whenever the app adds or hot-updates a stylesheet (lazy chunks, HMR).
  useEffect(() => {
    if (!mountNode) return
    const doc = mountNode.ownerDocument
    let frame = 0
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => syncStyles(doc))
    })
    observer.observe(document.head, { childList: true, subtree: true, characterData: true })
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [mountNode])

  return (
    <>
      <iframe
        ref={iframeRef}
        title={title}
        srcDoc={SRC_DOC}
        onLoad={onLoad}
        style={{ width, height, border: 0, display: 'block', background: '#fff' }}
      />
      {mountNode && createPortal(children, mountNode)}
    </>
  )
}
