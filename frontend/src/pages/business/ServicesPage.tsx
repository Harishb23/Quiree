import { useState, type FormEvent } from 'react'
import { Plus, Wrench } from 'lucide-react'
import { businessCatalogApi } from '../../api/businessApi'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { useAsync } from '../../hooks/useAsync'
import { paiseToRupees, rupeesToPaise } from '../../lib/business'
import { Button } from '../../components/ui/Button'
import { TextArea, TextField } from '../../components/ui/Field'
import { Alert, EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import { Modal, Toggle } from '../../components/ui/Surface'
import { ConfirmDialog, ImageUploader } from '../../components/ui/Widgets'
import { useToast } from '../../components/ui/Toast'
import { BusinessServiceCard } from '../../components/business/catalog/BusinessServiceCard'
import type { BusinessServiceItem, ServiceUpsertRequest } from '../../types/business'
import { useBusiness } from './BusinessShell'
import shared from '../dashboard/Dashboard.module.scss'
import styles from '../../components/business/catalog/Catalog.module.scss'

interface ServiceForm {
  name: string
  description: string
  price: string
  priceNote: string
  duration: string
  isAvailable: boolean
  isFeatured: boolean
}

const toForm = (s?: BusinessServiceItem | null): ServiceForm => ({
  name: s?.name ?? '',
  description: s?.description ?? '',
  price: paiseToRupees(s?.priceInPaise),
  priceNote: s?.priceNote ?? '',
  duration: s?.durationMinutes ? String(s.durationMinutes) : '',
  isAvailable: s?.isAvailable ?? true,
  isFeatured: s?.isFeatured ?? false,
})

export function validateServiceForm(f: ServiceForm): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!f.name.trim()) errors.name = 'Service name is required.'
  if (Number.isNaN(rupeesToPaise(f.price))) errors.priceInPaise = 'Enter a valid price, e.g. 499.'
  if (f.duration && !/^\d+$/.test(f.duration.trim())) errors.durationMinutes = 'Enter the duration in whole minutes.'
  else if (f.duration && (Number(f.duration) < 1 || Number(f.duration) > 10080)) errors.durationMinutes = 'Duration must be between 1 minute and 7 days.'
  return errors
}

const toPayload = (f: ServiceForm): ServiceUpsertRequest => ({
  name: f.name.trim(),
  description: f.description.trim() || null,
  priceInPaise: rupeesToPaise(f.price),
  priceNote: f.priceNote.trim() || null,
  durationMinutes: f.duration ? Number(f.duration) : null,
  isAvailable: f.isAvailable,
  isFeatured: f.isFeatured,
})

export default function ServicesPage() {
  const { business } = useBusiness()
  const toast = useToast()
  const services = useAsync(() => businessCatalogApi.services(business.id), [business.id])
  const [editing, setEditing] = useState<BusinessServiceItem | 'new' | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<BusinessServiceItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const replace = (s: BusinessServiceItem) =>
    services.setData((prev) => (prev?.some((x) => x.id === s.id) ? prev.map((x) => (x.id === s.id ? s : x)) : [...(prev ?? []), s]))

  async function toggleAvailable(s: BusinessServiceItem, value: boolean) {
    setBusyId(s.id)
    try {
      replace(await businessCatalogApi.updateService(business.id, s.id, { ...toPayload(toForm(s)), isAvailable: value }))
      toast.success(value ? `${s.name} is visible on your storefront.` : `${s.name} is hidden.`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await businessCatalogApi.deleteService(business.id, toDelete.id)
      services.setData((prev) => (prev ?? []).filter((s) => s.id !== toDelete.id))
      toast.success(`${toDelete.name} deleted.`)
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
          <h1>Services</h1>
          <p>What you offer beyond products — repairs, appointments, decoration, consultations and more.</p>
        </div>
        <Button icon={<Plus />} onClick={() => setEditing('new')}>
          Add service
        </Button>
      </div>

      {services.error ? (
        <ErrorState message={services.error} onRetry={services.reload} />
      ) : services.loading && !services.data ? (
        <div className={styles.cardGrid} aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={styles.skeletonCard} style={{ padding: 16 }}>
              <Skeleton width="60%" height={18} />
              <Skeleton width="90%" height={14} />
              <Skeleton width="40%" height={14} />
            </div>
          ))}
        </div>
      ) : !services.data?.length ? (
        <EmptyState
          icon={<Wrench />}
          title="No services yet"
          description="For example: Haircut, Custom bouquets, Phone screen repair or Home delivery setup."
          action={
            <Button icon={<Plus />} onClick={() => setEditing('new')}>
              Add service
            </Button>
          }
        />
      ) : (
        <div className={styles.cardGrid}>
          {services.data.map((s) => (
            <BusinessServiceCard
              key={s.id}
              service={s}
              busy={busyId === s.id}
              onEdit={() => setEditing(s)}
              onToggleAvailable={(v) => toggleAvailable(s, v)}
              onDelete={() => setToDelete(s)}
            />
          ))}
        </div>
      )}

      {editing && (
        <ServiceModal
          businessId={business.id}
          service={editing === 'new' ? null : editing}
          onSaved={(s) => {
            replace(s)
            setEditing(null)
          }}
          onImageChanged={(s) => {
            replace(s)
            setEditing(s)
          }}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog open={!!toDelete} title="Delete service?" confirmLabel="Delete" busy={deleting} onConfirm={confirmDelete} onClose={() => setToDelete(null)}>
        <p>
          <strong>{toDelete?.name}</strong> will be permanently removed from your storefront.
        </p>
      </ConfirmDialog>
    </>
  )
}

function ServiceModal({
  businessId,
  service,
  onSaved,
  onImageChanged,
  onClose,
}: {
  businessId: string
  service: BusinessServiceItem | null
  onSaved: (s: BusinessServiceItem, created: boolean) => void
  onImageChanged: (s: BusinessServiceItem) => void
  onClose: () => void
}) {
  const toast = useToast()
  const [form, setForm] = useState(() => toForm(service))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = (patch: Partial<ServiceForm>) => setForm((f) => ({ ...f, ...patch }))
  // Photo picked before the service exists; uploaded right after it is created.
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null)

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    const found = validateServiceForm(form)
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    setError(null)
    try {
      let saved = service
        ? await businessCatalogApi.updateService(businessId, service.id, toPayload(form))
        : await businessCatalogApi.createService(businessId, toPayload(form))
      if (!service && pendingPhoto) {
        // The service is saved either way; a failed photo is reported rather than undoing that.
        try {
          saved = await businessCatalogApi.uploadServiceImage(businessId, saved.id, pendingPhoto)
        } catch (uploadErr) {
          toast.error(`Service added, but the photo couldn’t be uploaded: ${getErrorMessage(uploadErr)}`)
        }
      }
      toast.success(service ? 'Service saved.' : 'Service added.')
      onSaved(saved, !service)
    } catch (err) {
      setErrors(getFieldErrors(err))
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      title={service ? `Edit ${service.name}` : 'Add service'}
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {service ? 'Close' : 'Cancel'}
          </Button>
          <Button loading={saving} onClick={() => void submit()}>
            {service ? 'Save service' : 'Add service'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className={shared.stack} style={{ gap: 14 }}>
        {error && <Alert tone="error">{error}</Alert>}
        <TextField label="Service name" required maxLength={150} value={form.name} error={errors.name} onChange={(e) => set({ name: e.target.value })} />
        <TextArea label="Description" rows={3} maxLength={2000} value={form.description} onChange={(e) => set({ description: e.target.value })} />
        <div className={shared.formGrid}>
          <TextField label="Price (₹)" inputMode="decimal" placeholder="Leave empty for “on request”" value={form.price} error={errors.priceInPaise} onChange={(e) => set({ price: e.target.value })} />
          <TextField label="Price note" placeholder="e.g. starting from, per hour" maxLength={50} value={form.priceNote} onChange={(e) => set({ priceNote: e.target.value })} />
          <TextField label="Duration (minutes)" inputMode="numeric" placeholder="e.g. 45" value={form.duration} error={errors.durationMinutes} onChange={(e) => set({ duration: e.target.value })} />
        </div>
        <div className={styles.toggleRow}>
          <div>
            <strong>Show on storefront</strong>
            <span>Hidden services stay saved but aren’t shown.</span>
          </div>
          <Toggle checked={form.isAvailable} label="Show on storefront" onChange={(v) => set({ isAvailable: v })} />
        </div>
        <div className={styles.toggleRow}>
          <div>
            <strong>Featured service</strong>
            <span>Shown first and highlighted.</span>
          </div>
          <Toggle checked={form.isFeatured} label="Featured service" onChange={(v) => set({ isFeatured: v })} />
        </div>
        <ImageUploader
          label="Service photo"
          aspect="wide"
          currentUrl={service?.imageUrl}
          pending={service ? undefined : { files: pendingPhoto ? [pendingPhoto] : [], onChange: (files) => setPendingPhoto(files[0] ?? null) }}
          upload={async (files, onProgress) => {
            if (!service) return
            onImageChanged(await businessCatalogApi.uploadServiceImage(businessId, service.id, files[0]!, onProgress))
            toast.success('Photo updated.')
          }}
          onRemove={
            service
              ? async () => {
                  onImageChanged(await businessCatalogApi.removeServiceImage(businessId, service.id))
                }
              : undefined
          }
        />
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
