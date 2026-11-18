import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, ImagePlus, Trash2, UploadCloud, X } from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Surface'
import { assetUrl } from '../../lib/url'
import { getErrorMessage } from '../../api/client'
import { ACCEPTED_IMAGES, optimizeImage, validateImageFile } from '../../lib/business'
import styles from './Widgets.module.scss'

// ---------------------------------------------------------------------------
// Confirm dialog
// ---------------------------------------------------------------------------

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  tone = 'danger',
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel?: string
  tone?: 'danger' | 'primary'
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      title={title}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className={styles.confirmBody}>{children}</div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  // Compact page list: 1 … p-1 p p+1 … last
  const items: (number | '…')[] = []
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) items.push(p)
    else if (items[items.length - 1] !== '…') items.push('…')
  }

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <span className={styles.pageInfo}>
        {from}–{to} of {total}
      </span>
      <div className={styles.pageButtons}>
        <button type="button" className={styles.pageBtn} onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft />
        </button>
        {items.map((item, i) =>
          item === '…' ? (
            <span key={`gap-${i}`} className={styles.pageGap}>
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={[styles.pageBtn, item === page && styles.pageActive].filter(Boolean).join(' ')}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onChange(item)}
            >
              {item}
            </button>
          ),
        )}
        <button type="button" className={styles.pageBtn} onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Next page">
          <ChevronRight />
        </button>
      </div>
    </nav>
  )
}

// ---------------------------------------------------------------------------
// Image uploader
// ---------------------------------------------------------------------------

export type UploadFn = (files: File[], onProgress: (percent: number) => void) => Promise<void>

/**
 * Images chosen before the record exists (e.g. while creating a product). They're validated and resized
 * straight away, previewed, and uploaded by the caller right after the first save — so people never have to
 * save first and come back to add photos.
 */
export interface PendingImages {
  files: File[]
  onChange: (files: File[]) => void
  /** Most files to keep (multiple mode). */
  max?: number
}

/**
 * Drop zone / picker for images. Validates type and size, downsizes photos in the browser and
 * reports upload progress. `upload` performs the request; errors it throws are shown inline.
 * With `pending`, nothing is sent: the chosen images are held until the caller saves.
 */
export function ImageUploader({
  label,
  hint,
  currentUrl,
  multiple = false,
  aspect = 'square',
  disabled,
  disabledReason,
  upload,
  onRemove,
  pending,
}: {
  label: string
  hint?: string
  /** Shows the existing image with replace / remove controls (single mode). */
  currentUrl?: string | null
  multiple?: boolean
  aspect?: 'square' | 'wide' | 'banner'
  disabled?: boolean
  /** Shown instead of the drop zone when disabled (e.g. "You’ve reached 8 photos"). */
  disabledReason?: string
  upload: UploadFn
  onRemove?: () => Promise<void>
  pending?: PendingImages
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  // Object URLs for held images, released when they change or the component unmounts.
  const pendingFiles = pending?.files
  const pendingUrls = useMemo(() => (pendingFiles ?? []).map((f) => URL.createObjectURL(f)), [pendingFiles])
  useEffect(() => () => pendingUrls.forEach((u) => URL.revokeObjectURL(u)), [pendingUrls])

  async function handle(list: FileList | null) {
    if (!list?.length || disabled) return
    const files = Array.from(list).slice(0, multiple ? 8 : 1)
    const invalid = files.map(validateImageFile).find(Boolean)
    if (invalid) {
      setError(invalid)
      return
    }
    setError(null)

    if (pending) {
      try {
        const optimized = await Promise.all(files.map((f) => optimizeImage(f)))
        const max = multiple ? (pending.max ?? 8) : 1
        pending.onChange(multiple ? [...pending.files, ...optimized].slice(0, max) : optimized.slice(0, 1))
      } finally {
        if (inputRef.current) inputRef.current.value = ''
      }
      return
    }

    if (!multiple) setPreview(URL.createObjectURL(files[0]!))
    setProgress(0)
    try {
      const optimized = await Promise.all(files.map((f) => optimizeImage(f)))
      await upload(optimized, setProgress)
    } catch (e) {
      setError(getErrorMessage(e, 'Upload failed. Please try again.'))
    } finally {
      setProgress(null)
      setPreview(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function remove() {
    if (!onRemove) return
    setError(null)
    setProgress(0)
    try {
      await onRemove()
    } catch (e) {
      setError(getErrorMessage(e, 'Could not remove the image.'))
    } finally {
      setProgress(null)
    }
  }

  const removePending = (index: number) => pending?.onChange(pending.files.filter((_, i) => i !== index))

  const shown = preview ?? (pending && !multiple ? pendingUrls[0] : undefined) ?? assetUrl(currentUrl)
  const busy = progress !== null
  const pendingCount = pending?.files.length ?? 0
  const footHint = hint ?? 'JPG, PNG or WEBP · up to 5 MB'

  return (
    <div className={styles.uploader}>
      <span className={styles.uploaderLabel}>{label}</span>
      {disabled && disabledReason ? (
        <div className={[styles.drop, styles[aspect], styles.dropDisabled].join(' ')}>
          <ImagePlus aria-hidden />
          <span>{disabledReason}</span>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={[styles.drop, styles[aspect], dragging && styles.dragging, shown && !multiple && styles.hasImage].filter(Boolean).join(' ')}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            void handle(e.dataTransfer.files)
          }}
        >
          {shown && !multiple ? (
            <img src={shown} alt="" className={styles.dropImage} />
          ) : (
            <>
              <UploadCloud aria-hidden />
              <span>
                <strong>Click to upload</strong> or drag {multiple ? 'images' : 'an image'} here
              </span>
            </>
          )}
          {busy && (
            <span className={styles.progress} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${progress}%` }} />
              <em>{progress! < 100 ? `Uploading ${progress}%` : 'Processing…'}</em>
            </span>
          )}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPTED_IMAGES}
            multiple={multiple}
            disabled={disabled || busy}
            className="sr-only"
            onChange={(e) => void handle(e.target.files)}
          />
        </label>
      )}

      {pending && multiple && pendingCount > 0 && (
        <ul className={styles.pendingGrid} aria-label="Photos to upload">
          {pendingUrls.map((url, i) => (
            <li key={url} className={styles.pendingTile}>
              <img src={url} alt={`Photo ${i + 1} to upload`} />
              <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => removePending(i)}>
                <X aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.uploaderFoot}>
        <span className={styles.uploaderHint}>
          {pending && pendingCount > 0 ? `${pendingCount > 1 ? `${pendingCount} photos` : 'Photo'} will upload when you save · ` : ''}
          {footHint}
        </span>
        {pending && !multiple && pendingCount > 0 ? (
          <button type="button" className={styles.removeLink} onClick={() => removePending(0)}>
            <Trash2 aria-hidden /> Remove
          </button>
        ) : (
          currentUrl &&
          onRemove &&
          !multiple &&
          !busy && (
            <button type="button" className={styles.removeLink} onClick={remove}>
              <Trash2 aria-hidden /> Remove
            </button>
          )
        )}
      </div>
      {error && (
        <p className={styles.uploaderError} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}


// ---------------------------------------------------------------------------
// Segmented filter tabs
// ---------------------------------------------------------------------------

export function FilterTabs<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string; count?: number }[]
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className={styles.tabs} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={[styles.tab, o.value === value && styles.tabActive].filter(Boolean).join(' ')}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined && <span className={styles.tabCount}>{o.count}</span>}
        </button>
      ))}
    </div>
  )
}
