import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Surface'
import { assetUrl } from '../../../lib/url'
import { galleryLabel } from '../../../lib/business'
import type { GalleryImage } from '../../../types/business'
import shared from '../../../pages/dashboard/Dashboard.module.scss'
import styles from './Catalog.module.scss'

/** Masonry gallery grid with a keyboard-navigable lightbox. */
export function BusinessGallery({
  images,
  onEdit,
  onDelete,
}: {
  images: GalleryImage[]
  onEdit: (image: GalleryImage) => void
  onDelete: (image: GalleryImage) => void
}) {
  const [index, setIndex] = useState<number | null>(null)
  const current = index != null ? images[index] : undefined

  useEffect(() => {
    if (index == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex((i) => (i == null ? i : (i + 1) % images.length))
      if (e.key === 'ArrowLeft') setIndex((i) => (i == null ? i : (i - 1 + images.length) % images.length))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, images.length])

  return (
    <>
      <div className={styles.galleryGrid}>
        {images.map((img, i) => (
          <figure key={img.id} className={styles.galleryTile} style={{ margin: '0 0 14px' }}>
            <button type="button" onClick={() => setIndex(i)} aria-label={`View ${img.caption || galleryLabel(img.category)} photo`}>
              <img src={assetUrl(img.url)} alt={img.caption ?? ''} loading="lazy" />
            </button>
            <figcaption className={styles.galleryInfo}>
              <div>
                <strong>{img.caption || 'No caption'}</strong>
                <span>{galleryLabel(img.category)}</span>
              </div>
              <button type="button" className={shared.iconBtn} aria-label="Edit photo details" onClick={() => onEdit(img)}>
                <Pencil />
              </button>
              <button
                type="button"
                className={[shared.iconBtn, shared.iconBtnDanger].join(' ')}
                aria-label="Delete photo"
                onClick={() => onDelete(img)}
              >
                <Trash2 />
              </button>
            </figcaption>
          </figure>
        ))}
      </div>

      <Modal open={!!current} title={current?.caption || (current ? galleryLabel(current.category) : '')} size="xl" onClose={() => setIndex(null)}>
        {current && (
          <div className={styles.lightbox}>
            <img src={assetUrl(current.url)} alt={current.caption ?? ''} />
            <div className={styles.lightboxNav}>
              <Button
                variant="outline"
                size="sm"
                icon={<ChevronLeft />}
                disabled={images.length < 2}
                onClick={() => setIndex((i) => (i! - 1 + images.length) % images.length)}
              >
                Previous
              </Button>
              <p>
                {index! + 1} / {images.length} · {galleryLabel(current.category)}
              </p>
              <Button
                variant="outline"
                size="sm"
                iconRight={<ChevronRight />}
                disabled={images.length < 2}
                onClick={() => setIndex((i) => (i! + 1) % images.length)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
