import { useMemo, useState, type FormEvent } from 'react'
import { Plus, Tag } from 'lucide-react'
import { businessCatalogApi } from '../../api/businessApi'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { useAsync } from '../../hooks/useAsync'
import { OFFER_STATES, paiseToRupees, rupeesToPaise } from '../../lib/business'
import { Button } from '../../components/ui/Button'
import { TextArea, TextField } from '../../components/ui/Field'
import { Alert, EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import { Modal, Toggle } from '../../components/ui/Surface'
import { ConfirmDialog, FilterTabs, ImageUploader } from '../../components/ui/Widgets'
import { useToast } from '../../components/ui/Toast'
import { BusinessOfferCard } from '../../components/business/catalog/BusinessOfferCard'
import type { Offer, OfferState, OfferUpsertRequest } from '../../types/business'
import { useBusiness } from './BusinessShell'
import shared from '../dashboard/Dashboard.module.scss'
import styles from '../../components/business/catalog/Catalog.module.scss'

type DiscountKind = 'none' | 'percent' | 'amount'
type Tab = 'All' | OfferState

interface OfferForm {
  title: string
  description: string
  kind: DiscountKind
  percent: string
  amount: string
  startDate: string
  endDate: string
  isActive: boolean
  isFeatured: boolean
}

const toForm = (o?: Offer | null): OfferForm => ({
  title: o?.title ?? '',
  description: o?.description ?? '',
  kind: o?.discountPercent ? 'percent' : o?.discountAmountInPaise ? 'amount' : 'none',
  percent: o?.discountPercent ? String(o.discountPercent) : '',
  amount: paiseToRupees(o?.discountAmountInPaise),
  startDate: o?.startDate ?? '',
  endDate: o?.endDate ?? '',
  isActive: o?.isActive ?? true,
  isFeatured: o?.isFeatured ?? false,
})

export function validateOfferForm(f: OfferForm): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!f.title.trim()) errors.title = 'Offer title is required.'
  if (f.kind === 'percent' && !(/^\d+$/.test(f.percent) && Number(f.percent) >= 1 && Number(f.percent) <= 100))
    errors.discountPercent = 'Enter a percentage between 1 and 100.'
  if (f.kind === 'amount') {
    const amount = rupeesToPaise(f.amount)
    if (amount == null || Number.isNaN(amount) || amount < 100) errors.discountAmountInPaise = 'Enter a discount amount of at least ₹1.'
  }
  if (f.startDate && f.endDate && f.endDate < f.startDate) errors.endDate = 'End date can’t be before the start date.'
  return errors
}

const toPayload = (f: OfferForm): OfferUpsertRequest => ({
  title: f.title.trim(),
  description: f.description.trim() || null,
  discountPercent: f.kind === 'percent' ? Number(f.percent) : null,
  discountAmountInPaise: f.kind === 'amount' ? rupeesToPaise(f.amount) : null,
  startDate: f.startDate || null,
  endDate: f.endDate || null,
  isActive: f.isActive,
  isFeatured: f.isFeatured,
})

const offerToPayload = (o: Offer, patch: Partial<OfferUpsertRequest>): OfferUpsertRequest => ({
  title: o.title,
  description: o.description,
  discountPercent: o.discountPercent,
  discountAmountInPaise: o.discountAmountInPaise,
  startDate: o.startDate,
  endDate: o.endDate,
  isActive: o.isActive,
  isFeatured: o.isFeatured,
  ...patch,
})

export default function OffersPage() {
  const { business } = useBusiness()
  const toast = useToast()
  const offers = useAsync(() => businessCatalogApi.offers(business.id), [business.id])
  const [tab, setTab] = useState<Tab>('All')
  const [editing, setEditing] = useState<Offer | 'new' | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Offer | null>(null)
  const [deleting, setDeleting] = useState(false)

  const list = useMemo(() => offers.data ?? [], [offers.data])
  const tabs = useMemo(
    () => [
      { value: 'All' as Tab, label: 'All', count: list.length },
      ...(Object.keys(OFFER_STATES) as OfferState[]).map((s) => ({ value: s as Tab, label: OFFER_STATES[s].label, count: list.filter((o) => o.state === s).length })),
    ],
    [list],
  )
  const visible = tab === 'All' ? list : list.filter((o) => o.state === tab)

  const replace = (o: Offer) => offers.setData((prev) => (prev?.some((x) => x.id === o.id) ? prev.map((x) => (x.id === o.id ? o : x)) : [o, ...(prev ?? [])]))

  async function toggleActive(o: Offer, value: boolean) {
    setBusyId(o.id)
    try {
      replace(await businessCatalogApi.updateOffer(business.id, o.id, offerToPayload(o, { isActive: value })))
      toast.success(value ? `${o.title} is active.` : `${o.title} is paused.`)
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
      await businessCatalogApi.deleteOffer(business.id, toDelete.id)
      offers.setData((prev) => (prev ?? []).filter((o) => o.id !== toDelete.id))
      toast.success('Offer deleted.')
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
          <h1>Offers &amp; promotions</h1>
          <p>Live offers appear on your storefront automatically between their start and end dates.</p>
        </div>
        <Button icon={<Plus />} onClick={() => setEditing('new')}>
          Create offer
        </Button>
      </div>

      {offers.error ? (
        <ErrorState message={offers.error} onRetry={offers.reload} />
      ) : offers.loading && !offers.data ? (
        <div className={styles.cardGrid} aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <Skeleton height={110} radius={0} />
              <Skeleton width="60%" height={18} />
              <Skeleton width="40%" height={14} />
            </div>
          ))}
        </div>
      ) : !list.length ? (
        <EmptyState
          icon={<Tag />}
          title="No offers yet"
          description="Run a festive sale, a weekend discount or a launch promotion. Customers see live offers at the top of your storefront."
          action={
            <Button icon={<Plus />} onClick={() => setEditing('new')}>
              Create offer
            </Button>
          }
        />
      ) : (
        <>
          <div className={styles.toolbarRow}>
            <FilterTabs label="Filter offers" value={tab} options={tabs} onChange={setTab} />
          </div>
          {visible.length ? (
            <div className={styles.cardGrid}>
              {visible.map((o) => (
                <BusinessOfferCard
                  key={o.id}
                  offer={o}
                  busy={busyId === o.id}
                  onEdit={() => setEditing(o)}
                  onToggleActive={(v) => toggleActive(o, v)}
                  onDelete={() => setToDelete(o)}
                />
              ))}
            </div>
          ) : (
            <EmptyState icon={<Tag />} title={`No ${OFFER_STATES[tab as OfferState].label.toLowerCase()} offers`} description="Try another tab." />
          )}
        </>
      )}

      {editing && (
        <OfferModal
          businessId={business.id}
          offer={editing === 'new' ? null : editing}
          onSaved={(o) => {
            replace(o)
            setEditing(null)
          }}
          onBannerChanged={(o) => {
            replace(o)
            setEditing(o)
          }}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog open={!!toDelete} title="Delete offer?" confirmLabel="Delete" busy={deleting} onConfirm={confirmDelete} onClose={() => setToDelete(null)}>
        <p>
          <strong>{toDelete?.title}</strong> will be permanently removed. To hide it temporarily, switch it off instead.
        </p>
      </ConfirmDialog>
    </>
  )
}

function OfferModal({
  businessId,
  offer,
  onSaved,
  onBannerChanged,
  onClose,
}: {
  businessId: string
  offer: Offer | null
  onSaved: (o: Offer, created: boolean) => void
  onBannerChanged: (o: Offer) => void
  onClose: () => void
}) {
  const toast = useToast()
  const [form, setForm] = useState(() => toForm(offer))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = (patch: Partial<OfferForm>) => setForm((f) => ({ ...f, ...patch }))
  // Banner picked before the offer exists; uploaded right after it is created.
  const [pendingBanner, setPendingBanner] = useState<File | null>(null)

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    const found = validateOfferForm(form)
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    setError(null)
    try {
      let saved = offer ? await businessCatalogApi.updateOffer(businessId, offer.id, toPayload(form)) : await businessCatalogApi.createOffer(businessId, toPayload(form))
      if (!offer && pendingBanner) {
        // The offer is saved either way; a failed banner is reported rather than undoing that.
        try {
          saved = await businessCatalogApi.uploadOfferBanner(businessId, saved.id, pendingBanner)
        } catch (uploadErr) {
          toast.error(`Offer created, but the banner couldn’t be uploaded: ${getErrorMessage(uploadErr)}`)
        }
      }
      toast.success(offer ? 'Offer saved.' : 'Offer created.')
      onSaved(saved, !offer)
    } catch (err) {
      setErrors(getFieldErrors(err))
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const kinds: { value: DiscountKind; label: string }[] = [
    { value: 'none', label: 'No discount' },
    { value: 'percent', label: 'Percentage' },
    { value: 'amount', label: 'Fixed amount' },
  ]

  return (
    <Modal
      open
      title={offer ? `Edit ${offer.title}` : 'Create offer'}
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {offer ? 'Close' : 'Cancel'}
          </Button>
          <Button loading={saving} onClick={() => void submit()}>
            {offer ? 'Save offer' : 'Create offer'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className={shared.stack} style={{ gap: 14 }}>
        {error && <Alert tone="error">{error}</Alert>}
        <TextField label="Offer title" required maxLength={120} placeholder="e.g. Diwali Sale" value={form.title} error={errors.title} onChange={(e) => set({ title: e.target.value })} />
        <TextArea label="Description" rows={3} maxLength={1000} value={form.description} onChange={(e) => set({ description: e.target.value })} />
        <div>
          <span className={styles.fieldLabel}>Discount</span>
          <div className={styles.radioGroup} role="radiogroup" aria-label="Discount type">
            {kinds.map((k) => (
              <button key={k.value} type="button" role="radio" aria-checked={form.kind === k.value} aria-pressed={form.kind === k.value} className={styles.chipToggle} onClick={() => set({ kind: k.value })}>
                {k.label}
              </button>
            ))}
          </div>
        </div>
        {form.kind === 'percent' && (
          <TextField label="Discount (%)" inputMode="numeric" placeholder="e.g. 20" value={form.percent} error={errors.discountPercent} onChange={(e) => set({ percent: e.target.value })} />
        )}
        {form.kind === 'amount' && (
          <TextField label="Discount amount (₹)" inputMode="decimal" placeholder="e.g. 500" value={form.amount} error={errors.discountAmountInPaise} onChange={(e) => set({ amount: e.target.value })} />
        )}
        <div className={shared.formGrid}>
          <TextField label="Start date" type="date" value={form.startDate} hint="Leave empty to start now." onChange={(e) => set({ startDate: e.target.value })} />
          <TextField label="End date" type="date" value={form.endDate} min={form.startDate || undefined} error={errors.endDate} hint="Leave empty for no end date." onChange={(e) => set({ endDate: e.target.value })} />
        </div>
        <div className={styles.toggleRow}>
          <div>
            <strong>Active</strong>
            <span>Switch off to pause the offer without deleting it.</span>
          </div>
          <Toggle checked={form.isActive} label="Active" onChange={(v) => set({ isActive: v })} />
        </div>
        <div className={styles.toggleRow}>
          <div>
            <strong>Featured offer</strong>
            <span>Highlighted at the top of your storefront.</span>
          </div>
          <Toggle checked={form.isFeatured} label="Featured offer" onChange={(v) => set({ isFeatured: v })} />
        </div>
        <ImageUploader
          label="Offer banner"
          aspect="banner"
          hint="Wide image works best (3:1) · JPG, PNG or WEBP · up to 5 MB"
          currentUrl={offer?.bannerUrl}
          pending={offer ? undefined : { files: pendingBanner ? [pendingBanner] : [], onChange: (files) => setPendingBanner(files[0] ?? null) }}
          upload={async (files, onProgress) => {
            if (!offer) return
            onBannerChanged(await businessCatalogApi.uploadOfferBanner(businessId, offer.id, files[0]!, onProgress))
            toast.success('Banner updated.')
          }}
          onRemove={offer ? async () => onBannerChanged(await businessCatalogApi.removeOfferBanner(businessId, offer.id)) : undefined}
        />
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
