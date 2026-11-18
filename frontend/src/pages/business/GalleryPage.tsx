import { useMemo, useState } from 'react'
import { Images } from 'lucide-react'
import { businessCatalogApi } from '../../api/businessApi'
import { getErrorMessage } from '../../api/client'
import { useAsync } from '../../hooks/useAsync'
import { GALLERY_CATEGORIES } from '../../lib/business'
import { Button } from '../../components/ui/Button'
import { SelectField, TextField } from '../../components/ui/Field'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import { CardHeader, GlassCard, Modal } from '../../components/ui/Surface'
import { ConfirmDialog, FilterTabs, ImageUploader } from '../../components/ui/Widgets'
import { useToast } from '../../components/ui/Toast'
import { BusinessGallery } from '../../components/business/catalog/BusinessGallery'
import type { GalleryCategory, GalleryImage } from '../../types/business'
import { useBusiness } from './BusinessShell'
import shared from '../dashboard/Dashboard.module.scss'
import styles from '../../components/business/catalog/Catalog.module.scss'

const MAX_PHOTOS = 60
type Tab = 'All' | GalleryCategory

export default function GalleryPage() {
  const { business } = useBusiness()
  const toast = useToast()
  const gallery = useAsync(() => businessCatalogApi.gallery(business.id), [business.id])
  const [tab, setTab] = useState<Tab>('All')
  const [category, setCategory] = useState<GalleryCategory>('Interior')
  const [caption, setCaption] = useState('')
  const [editing, setEditing] = useState<GalleryImage | null>(null)
  const [toDelete, setToDelete] = useState<GalleryImage | null>(null)
  const [deleting, setDeleting] = useState(false)

  const images = useMemo(() => gallery.data ?? [], [gallery.data])
  const visible = tab === 'All' ? images : images.filter((i) => i.category === tab)
  const remaining = MAX_PHOTOS - images.length
  const tabs = [
    { value: 'All' as Tab, label: 'All', count: images.length },
    ...GALLERY_CATEGORIES.map((c) => ({ value: c.value as Tab, label: c.label, count: images.filter((i) => i.category === c.value).length })),
  ]

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await businessCatalogApi.deleteGalleryImage(business.id, toDelete.id)
      gallery.setData((prev) => (prev ?? []).filter((i) => i.id !== toDelete.id))
      toast.success('Photo deleted.')
      setToDelete(null)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className={shared.pageHeader}>
        <div>
          <h1>Gallery</h1>
          <p>Show customers your shop, products, team and events. {images.length} of {MAX_PHOTOS} photos used.</p>
        </div>
      </div>

      <GlassCard className={styles.uploadPanel} style={{ marginBottom: 20 }}>
        <div className={styles.uploadMeta}>
          <CardHeader title="Upload photos" subtitle="Choose the category and caption first — they apply to every photo in this upload." />
          <SelectField label="Category" value={category} onChange={(e) => setCategory(e.target.value as GalleryCategory)} options={GALLERY_CATEGORIES} />
          <TextField label="Caption (optional)" maxLength={150} value={caption} onChange={(e) => setCaption(e.target.value)} />
        </div>
        <ImageUploader
          label="Photos"
          multiple
          aspect="wide"
          disabled={remaining <= 0}
          disabledReason={`The gallery is full (${MAX_PHOTOS} photos). Delete some to add more.`}
          hint={`Up to 8 at a time · JPG, PNG or WEBP · 5 MB each · ${Math.max(0, remaining)} left`}
          upload={async (files, onProgress) => {
            // Upload one by one so each photo succeeds or fails on its own, with combined progress.
            const batch = files.slice(0, Math.max(0, remaining))
            let added = 0
            try {
              for (let i = 0; i < batch.length; i++) {
                const image = await businessCatalogApi.addGalleryImage(business.id, batch[i]!, category, caption.trim(), (p) =>
                  onProgress(Math.round(((i + p / 100) / batch.length) * 100)),
                )
                added++
                gallery.setData((prev) => [image, ...(prev ?? [])])
              }
            } finally {
              if (added) toast.success(added > 1 ? `${added} photos added.` : 'Photo added.')
            }
            setCaption('')
          }}
        />
      </GlassCard>

      {gallery.error ? (
        <ErrorState message={gallery.error} onRetry={gallery.reload} />
      ) : gallery.loading && !gallery.data ? (
        <div className={styles.productGrid} aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} height={160} radius={14} />
          ))}
        </div>
      ) : !images.length ? (
        <EmptyState icon={<Images />} title="No photos yet" description="Upload photos of your shop front, interiors, best-selling products and team." />
      ) : (
        <>
          <div className={styles.toolbarRow}>
            <FilterTabs label="Filter photos" value={tab} options={tabs} onChange={setTab} />
          </div>
          {visible.length ? (
            <BusinessGallery images={visible} onEdit={setEditing} onDelete={setToDelete} />
          ) : (
            <EmptyState icon={<Images />} title="No photos in this category" description="Upload some, or move existing photos here by editing them." />
          )}
        </>
      )}

      {editing && (
        <EditPhotoModal
          businessId={business.id}
          image={editing}
          onSaved={(img) => {
            gallery.setData((prev) => (prev ?? []).map((i) => (i.id === img.id ? img : i)))
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog open={!!toDelete} title="Delete photo?" confirmLabel="Delete" busy={deleting} onConfirm={confirmDelete} onClose={() => setToDelete(null)}>
        <p>This photo will be permanently removed from your gallery and storefront.</p>
      </ConfirmDialog>
    </>
  )
}

function EditPhotoModal({
  businessId,
  image,
  onSaved,
  onClose,
}: {
  businessId: string
  image: GalleryImage
  onSaved: (image: GalleryImage) => void
  onClose: () => void
}) {
  const toast = useToast()
  const [category, setCategory] = useState(image.category)
  const [caption, setCaption] = useState(image.caption ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      onSaved(await businessCatalogApi.updateGalleryImage(businessId, image.id, category, caption.trim() || null))
      toast.success('Photo updated.')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      title="Edit photo"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className={shared.stack} style={{ gap: 14 }}>
        <SelectField label="Category" value={category} onChange={(e) => setCategory(e.target.value as GalleryCategory)} options={GALLERY_CATEGORIES} />
        <TextField label="Caption" maxLength={150} value={caption} onChange={(e) => setCaption(e.target.value)} />
      </div>
    </Modal>
  )
}
