import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Save, Trash2 } from 'lucide-react'
import { businessCatalogApi, businessCategoriesApi } from '../../api/businessApi'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { useAsync } from '../../hooks/useAsync'
import { assetUrl } from '../../lib/url'
import { Button } from '../../components/ui/Button'
import { Alert, ErrorState, PageLoader } from '../../components/ui/Feedback'
import { CardHeader, GlassCard } from '../../components/ui/Surface'
import { ConfirmDialog, ImageUploader } from '../../components/ui/Widgets'
import { useToast } from '../../components/ui/Toast'
import { BusinessProductForm } from '../../components/business/catalog/BusinessProductForm'
import {
  toProductForm,
  toProductPayload,
  validateProductForm,
  type FormErrors,
  type ProductFormState,
} from '../../components/business/catalog/productForm'
import type { Product } from '../../types/business'
import { useBusiness } from './BusinessShell'
import shared from '../dashboard/Dashboard.module.scss'
import styles from '../../components/business/catalog/Catalog.module.scss'

const MAX_IMAGES = 8

export default function ProductEditorPage() {
  const { productId } = useParams()
  const { business } = useBusiness()
  const navigate = useNavigate()
  const toast = useToast()
  const isNew = !productId

  const product = useAsync<Product | null>(() => (productId ? businessCatalogApi.product(business.id, productId) : Promise.resolve(null)), [business.id, productId])
  const attributes = useAsync(() => businessCategoriesApi.attributes(business.categoryId), [business.categoryId])
  const categories = useAsync(() => businessCatalogApi.productCategories(business.id), [business.id])

  const [form, setForm] = useState<ProductFormState>(() => toProductForm())
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // Photos picked before the product exists; uploaded right after it is created.
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([])

  // Populate the form once the product loads.
  useEffect(() => {
    if (product.data) setForm(toProductForm(product.data))
  }, [product.data])

  if (product.loading && productId && !product.data) return <PageLoader label="Loading product…" />
  if (product.error) return <ErrorState message={product.error} onRetry={product.reload} />

  const listUrl = `/dashboard/business/${business.id}/products`
  const attrs = attributes.data ?? []
  const current = product.data ?? null

  async function submit(e: FormEvent) {
    e.preventDefault()
    const found = validateProductForm(form, attrs)
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length) {
      setFormError('Please fix the highlighted fields.')
      return
    }
    setSaving(true)
    try {
      const payload = toProductPayload(form, attrs)
      if (current) {
        const updated = await businessCatalogApi.updateProduct(business.id, current.id, payload)
        product.setData(updated)
        toast.success('Product saved.')
      } else {
        const created = await businessCatalogApi.createProduct(business.id, payload)
        if (pendingPhotos.length) {
          // The product is saved either way; a failed upload is reported rather than undoing that.
          try {
            await businessCatalogApi.addProductImages(business.id, created.id, pendingPhotos)
            toast.success(`Product created with ${pendingPhotos.length} photo${pendingPhotos.length > 1 ? 's' : ''}.`)
          } catch (uploadErr) {
            toast.error(`Product created, but the photos couldn’t be uploaded: ${getErrorMessage(uploadErr)} You can add them again below.`)
          }
        } else {
          toast.success('Product created.')
        }
        navigate(`${listUrl}/${created.id}`, { replace: true })
      }
    } catch (err) {
      setErrors(getFieldErrors(err))
      setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function moveImage(index: number, delta: number) {
    if (!current) return
    const ids = current.images.map((i) => i.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]
    try {
      product.setData(await businessCatalogApi.reorderProductImages(business.id, current.id, ids))
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  async function removeImage(imageId: string) {
    if (!current) return
    try {
      product.setData(await businessCatalogApi.removeProductImage(business.id, current.id, imageId))
      toast.success('Photo removed.')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  async function deleteProduct() {
    if (!current) return
    setDeleting(true)
    try {
      await businessCatalogApi.deleteProduct(business.id, current.id)
      toast.success(`${current.name} deleted.`)
      navigate(listUrl, { replace: true })
    } catch (err) {
      toast.error(getErrorMessage(err))
      setDeleting(false)
    }
  }

  const imageCount = current?.images.length ?? 0
  const imagesCard = (
    <GlassCard>
      <CardHeader title="Photos" subtitle={`Up to ${MAX_IMAGES}. The first photo is the cover.`} />
      {current && current.images.length > 0 && (
        <div className={styles.imageGrid}>
          {current.images.map((img, i) => (
            <div key={img.id} className={styles.imageTile}>
              <img src={assetUrl(img.url)} alt={`${current.name} photo ${i + 1}`} />
              {i === 0 && <span className={styles.coverTag}>Cover</span>}
              <div className={styles.tileActions}>
                <button type="button" aria-label="Move photo left" disabled={i === 0} onClick={() => moveImage(i, -1)}>
                  <ChevronLeft />
                </button>
                <button type="button" aria-label="Remove photo" onClick={() => removeImage(img.id)}>
                  <Trash2 />
                </button>
                <button type="button" aria-label="Move photo right" disabled={i === current.images.length - 1} onClick={() => moveImage(i, 1)}>
                  <ChevronRight />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ImageUploader
        label={imageCount ? 'Add more photos' : 'Product photos'}
        multiple
        aspect="wide"
        disabled={!!current && imageCount >= MAX_IMAGES}
        disabledReason={`You’ve reached ${MAX_IMAGES} photos.`}
        pending={current ? undefined : { files: pendingPhotos, onChange: setPendingPhotos, max: MAX_IMAGES }}
        hint={`JPG, PNG or WEBP · up to 5 MB each · ${MAX_IMAGES - (current ? imageCount : pendingPhotos.length)} left`}
        upload={async (files, onProgress) => {
          if (!current) return
          const allowed = files.slice(0, MAX_IMAGES - imageCount)
          const updated = await businessCatalogApi.addProductImages(business.id, current.id, allowed, onProgress)
          product.setData(updated)
          toast.success(allowed.length > 1 ? `${allowed.length} photos added.` : 'Photo added.')
        }}
      />
    </GlassCard>
  )

  return (
    <form onSubmit={submit} noValidate>
      <div className={shared.pageHeader}>
        <div>
          <Link to={listUrl} className={shared.muted} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <ArrowLeft size={15} /> All products
          </Link>
          <h1>{isNew ? 'Add product' : current?.name || 'Edit product'}</h1>
          <p>{isNew ? 'Fill in the details, save, then add photos.' : 'Changes appear on your storefront as soon as you save.'}</p>
        </div>
        <div className={shared.headerActions}>
          {current && (
            <Button variant="ghost" icon={<Trash2 />} onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          )}
          <Button type="submit" icon={<Save />} loading={saving}>
            {isNew ? 'Create product' : 'Save changes'}
          </Button>
        </div>
      </div>

      {formError && (
        <div style={{ marginBottom: 16 }}>
          <Alert tone="error">{formError}</Alert>
        </div>
      )}
      {attributes.error && (
        <div style={{ marginBottom: 16 }}>
          <Alert tone="error">Couldn’t load the {business.categoryName} fields: {attributes.error}</Alert>
        </div>
      )}

      <BusinessProductForm
        form={form}
        errors={errors}
        categories={categories.data ?? []}
        attributes={attrs}
        attributesLoading={attributes.loading}
        categoryName={business.categoryName}
        onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        aside={imagesCard}
      />

      <div className={styles.formActions} style={{ marginTop: 20 }}>
        <Button to={listUrl} variant="ghost">
          Cancel
        </Button>
        <Button type="submit" icon={<Save />} loading={saving}>
          {isNew ? 'Create product' : 'Save changes'}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete product?"
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={deleteProduct}
        onClose={() => setConfirmDelete(false)}
      >
        <p>
          <strong>{current?.name}</strong> and its photos will be permanently removed.
        </p>
      </ConfirmDialog>
    </form>
  )
}
