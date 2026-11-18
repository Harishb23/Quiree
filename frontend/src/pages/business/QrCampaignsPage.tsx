import { useMemo, useRef, useState } from 'react'
import { ArrowLeft, Copy, Download, FileArchive, Layers, Pencil, Plus, ScanLine, Trash2 } from 'lucide-react'
import { businessCatalogApi, qrCampaignsApi } from '../../api/businessApi'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { useAsync } from '../../hooks/useAsync'
import { formatDate } from '../../lib/format'
import { svgToPng } from '../../lib/qrCard'
import { copyToClipboard, downloadBlob } from '../../lib/share'
import { Button } from '../../components/ui/Button'
import { Alert, Badge, EmptyState, ErrorState, PageLoader, Skeleton } from '../../components/ui/Feedback'
import { SelectField, TextField } from '../../components/ui/Field'
import { CardHeader, GlassCard, Modal, Toggle } from '../../components/ui/Surface'
import { ConfirmDialog, FilterTabs } from '../../components/ui/Widgets'
import { useToast } from '../../components/ui/Toast'
import { StyledQr } from '../../components/business/qr/StyledQr'
import {
  COLOR_PRESETS,
  DESTINATIONS,
  destinationLabel,
  emptyCampaign,
  isoToLocalInput,
  localInputToIso,
  toCampaignForm,
  validateCampaign,
} from '../../components/business/qr/campaignForm'
import type { BulkQrCampaignRequest, QrCampaign, QrCampaignUpsertRequest, QrDestination } from '../../types/business'
import { useBusiness } from './BusinessShell'
import dash from '../dashboard/Dashboard.module.scss'
import styles from './QrCampaignsPage.module.scss'

type Period = '7' | '30' | '90'

export default function QrCampaignsPage() {
  const { business, can } = useBusiness()
  const toast = useToast()
  const canManage = can('Manager')
  const campaigns = useAsync(() => qrCampaignsApi.list(business.id), [business.id])
  const [period, setPeriod] = useState<Period>('30')
  const stats = useAsync(() => qrCampaignsApi.stats(business.id, Number(period)), [business.id, period])
  const [editing, setEditing] = useState<QrCampaign | 'new' | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [toDelete, setToDelete] = useState<QrCampaign | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [zipping, setZipping] = useState(false)

  async function downloadZip() {
    setZipping(true)
    try {
      downloadBlob(await qrCampaignsApi.downloadZip(business.id, []), `${business.slug}-qr-codes.zip`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setZipping(false)
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await qrCampaignsApi.remove(business.id, toDelete.id)
      campaigns.setData((list) => (list ?? []).filter((c) => c.id !== toDelete.id))
      toast.success(`${toDelete.name} deleted. Its past scans stay in your statistics.`)
      setToDelete(null)
      void stats.reload()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setDeleting(false)
    }
  }

  function saved(list: QrCampaign[]) {
    campaigns.setData((prev) => {
      const map = new Map((prev ?? []).map((c) => [c.id, c]))
      for (const c of list) map.set(c.id, c)
      return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    })
    void stats.reload()
  }

  if (campaigns.loading && !campaigns.data) return <PageLoader label="Loading QR campaigns…" />
  if (campaigns.error) return <ErrorState message={campaigns.error} onRetry={campaigns.reload} />
  const list = campaigns.data ?? []

  return (
    <>
      <div className={dash.pageHeader}>
        <div>
          <Button to={`/dashboard/business/${business.id}/qr`} variant="ghost" size="sm" icon={<ArrowLeft />}>
            Main QR code
          </Button>
          <h1>QR campaigns</h1>
          <p>
            Extra QR codes for tables, packaging, posters or your billing counter — each opens a different place and has its own
            scan statistics. You can change where a code points at any time without reprinting it.
          </p>
        </div>
        <div className={dash.headerActions}>
          {list.length > 0 && (
            <Button variant="outline" icon={<FileArchive />} loading={zipping} onClick={downloadZip}>
              Download all (ZIP)
            </Button>
          )}
          {canManage && (
            <>
              <Button variant="secondary" icon={<Layers />} onClick={() => setBulkOpen(true)}>
                Bulk create
              </Button>
              <Button icon={<Plus />} onClick={() => setEditing('new')}>
                New campaign
              </Button>
            </>
          )}
        </div>
      </div>

      {business.status !== 'Published' && (
        <div style={{ marginBottom: 20 }}>
          <Alert tone="info">Your business is unpublished, so campaign codes won’t open anything until you publish it.</Alert>
        </div>
      )}

      <div className={dash.stack}>
        <GlassCard>
          <CardHeader
            title="Campaign comparison"
            subtitle="QR scans per code. Each person is counted once per code every 30 minutes; bots and your team are excluded."
            action={
              <FilterTabs
                label="Period"
                value={period}
                onChange={setPeriod}
                options={[
                  { value: '7', label: '7 days' },
                  { value: '30', label: '30 days' },
                  { value: '90', label: '90 days' },
                ]}
              />
            }
          />
          {stats.loading && !stats.data ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={28} />
              ))}
            </div>
          ) : stats.error ? (
            <ErrorState message={stats.error} onRetry={stats.reload} />
          ) : (
            <ComparisonBars items={stats.data?.items ?? []} />
          )}
        </GlassCard>

        {list.length === 0 ? (
          <EmptyState
            icon={<ScanLine />}
            title="No campaigns yet"
            description="Create a code for each place you put a QR — e.g. “Table 1–20”, “Packaging”, “Festive poster” — and see which one brings customers."
            action={
              canManage && (
                <Button icon={<Plus />} onClick={() => setEditing('new')}>
                  Create your first campaign
                </Button>
              )
            }
          />
        ) : (
          <div className={styles.grid}>
            {list.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                logoUrl={business.logoUrl}
                canManage={canManage}
                onEdit={() => setEditing(c)}
                onDelete={() => setToDelete(c)}
              />
            ))}
          </div>
        )}
      </div>

      {editing && (
        <CampaignEditor
          businessId={business.id}
          logoUrl={business.logoUrl}
          campaign={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(c) => {
            saved([c])
            setEditing(null)
            toast.success(editing === 'new' ? `${c.name} created.` : `${c.name} updated — the printed code now opens the new destination.`)
          }}
        />
      )}
      {bulkOpen && (
        <BulkCreator
          businessId={business.id}
          logoUrl={business.logoUrl}
          onClose={() => setBulkOpen(false)}
          onSaved={(created) => {
            saved(created)
            setBulkOpen(false)
            toast.success(`${created.length} QR codes created.`)
          }}
        />
      )}
      <ConfirmDialog
        open={!!toDelete}
        title="Delete this QR campaign?"
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      >
        <p>
          Printed copies of <strong>{toDelete?.name}</strong> will stop working (scanners see “QR not recognised”). Its scan history
          stays in your statistics. To pause it instead, turn it off.
        </p>
      </ConfirmDialog>
    </>
  )
}

// ---------------------------------------------------------------------------

function ComparisonBars({ items }: { items: { campaignId: string | null; name: string; scans: number; uniqueVisitors: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.scans))
  const total = items.reduce((s, i) => s + i.scans, 0)
  if (total === 0) return <p className={dash.muted}>No scans in this period yet. Scans appear here as soon as customers use your codes.</p>
  return (
    <ul className={styles.bars} aria-label="Scans per QR code">
      {items.map((i, index) => (
        <li key={i.campaignId ?? 'main'} className={styles.barRow}>
          <span className={styles.barName} title={i.name}>
            {i.name}
          </span>
          <span className={styles.barTrack} aria-hidden>
            <span className={[styles.barFill, index === 0 && i.scans > 0 && styles.barTop].filter(Boolean).join(' ')} style={{ width: `${(i.scans / max) * 100}%` }} />
          </span>
          <span className={styles.barValue}>
            <strong>{i.scans}</strong> scans · {i.uniqueVisitors} visitors
          </span>
        </li>
      ))}
    </ul>
  )
}

function CampaignCard({
  campaign: c,
  logoUrl,
  canManage,
  onEdit,
  onDelete,
}: {
  campaign: QrCampaign
  logoUrl: string | null
  canManage: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const toast = useToast()
  const svgRef = useRef<SVGSVGElement>(null)
  const status = c.isExpired
    ? { label: 'Ended', tone: 'gray' as const }
    : !c.isEnabled
      ? { label: 'Off', tone: 'amber' as const }
      : { label: 'Active', tone: 'green' as const }

  async function download() {
    if (!svgRef.current) return
    try {
      downloadBlob(await svgToPng(svgRef.current, 1200), `${c.name.replace(/[^\w-]+/g, '-')}-qr.png`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <GlassCard className={styles.card} padded={false}>
      <div className={[styles.preview, (!c.isEnabled || c.isExpired) && styles.previewOff].filter(Boolean).join(' ')}>
        <StyledQr
          ref={svgRef}
          url={c.qrUrl}
          foregroundColor={c.foregroundColor}
          backgroundColor={c.backgroundColor}
          logoUrl={logoUrl}
          showLogo={c.showLogo}
          frameText={c.frameText}
          label={c.name}
        />
      </div>
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h3 title={c.name}>{c.name}</h3>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <p className={styles.destination}>
          Opens <strong>{destinationLabel(c.destination)}</strong>
          {c.targetName && <> · {c.targetName}</>}
        </p>
        <div className={styles.metrics}>
          <span>
            <strong className={styles.gold}>{c.scansLast30Days}</strong> scans · 30 days
          </span>
          <span>{c.totalScans} all time</span>
        </div>
        {c.expiresAt && (
          <p className={dash.muted}>
            {c.isExpired ? 'Ended' : 'Ends'} {formatDate(c.expiresAt)}
          </p>
        )}
        <div className={styles.actions}>
          <Button size="sm" variant="secondary" icon={<Download />} onClick={download}>
            PNG
          </Button>
          <button
            type="button"
            className={dash.iconBtn}
            aria-label={`Copy link for ${c.name}`}
            onClick={async () => (await copyToClipboard(c.qrUrl)) && toast.success('QR link copied.')}
          >
            <Copy />
          </button>
          {canManage && (
            <>
              <button type="button" className={dash.iconBtn} aria-label={`Edit ${c.name}`} onClick={onEdit}>
                <Pencil />
              </button>
              <button type="button" className={[dash.iconBtn, dash.iconBtnDanger].join(' ')} aria-label={`Delete ${c.name}`} onClick={onDelete}>
                <Trash2 />
              </button>
            </>
          )}
        </div>
      </div>
    </GlassCard>
  )
}

// ---------------------------------------------------------------------------

function useTargets(businessId: string, destination: QrDestination) {
  const needsProducts = destination === 'Product'
  const needsOffers = destination === 'Offer'
  const products = useAsync(
    () => (needsProducts ? businessCatalogApi.products(businessId, { pageSize: 60, sort: 'name' }).then((r) => r.items) : Promise.resolve([])),
    [businessId, needsProducts],
  )
  const offers = useAsync(() => (needsOffers ? businessCatalogApi.offers(businessId) : Promise.resolve([])), [businessId, needsOffers])
  return { products, offers }
}

function StyleFields({
  form,
  set,
  error,
}: {
  form: Pick<QrCampaignUpsertRequest, 'foregroundColor' | 'backgroundColor' | 'showLogo' | 'frameText'>
  set: (patch: Partial<QrCampaignUpsertRequest>) => void
  error?: string
}) {
  return (
    <fieldset className={styles.fieldset}>
      <legend>Look</legend>
      <div className={styles.presets} role="group" aria-label="Colour presets">
        {COLOR_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className={[styles.preset, form.foregroundColor === p.fg && form.backgroundColor === p.bg && styles.presetActive].filter(Boolean).join(' ')}
            style={{ background: p.bg, color: p.fg }}
            onClick={() => set({ foregroundColor: p.fg, backgroundColor: p.bg })}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className={styles.colorRow}>
        <label className={styles.colorField}>
          <span>Code colour</span>
          <input type="color" value={form.foregroundColor} onChange={(e) => set({ foregroundColor: e.target.value.toUpperCase() })} />
          <code>{form.foregroundColor}</code>
        </label>
        <label className={styles.colorField}>
          <span>Background</span>
          <input type="color" value={form.backgroundColor} onChange={(e) => set({ backgroundColor: e.target.value.toUpperCase() })} />
          <code>{form.backgroundColor}</code>
        </label>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <TextField
        label="Caption under the code"
        placeholder="e.g. Scan for menu"
        maxLength={40}
        value={form.frameText ?? ''}
        onChange={(e) => set({ frameText: e.target.value || null })}
      />
      <label className={styles.toggleRow}>
        <span>Show my logo in the centre</span>
        <Toggle checked={form.showLogo} label="Show logo" onChange={(v) => set({ showLogo: v })} />
      </label>
    </fieldset>
  )
}

function CampaignEditor({
  businessId,
  logoUrl,
  campaign,
  onClose,
  onSaved,
}: {
  businessId: string
  logoUrl: string | null
  campaign: QrCampaign | null
  onClose: () => void
  onSaved: (c: QrCampaign) => void
}) {
  const [form, setForm] = useState<QrCampaignUpsertRequest>(() => (campaign ? toCampaignForm(campaign) : emptyCampaign()))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const set = (patch: Partial<QrCampaignUpsertRequest>) => setForm((f) => ({ ...f, ...patch }))
  const { products, offers } = useTargets(businessId, form.destination)
  const dest = DESTINATIONS.find((d) => d.value === form.destination)!
  const liveErrors = useMemo(() => validateCampaign(form), [form])

  async function save() {
    const found = validateCampaign(form)
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    setServerError(null)
    const body = { ...form, name: form.name.trim(), targetId: dest.needsTarget ? form.targetId : null }
    try {
      onSaved(campaign ? await qrCampaignsApi.update(businessId, campaign.id, body) : await qrCampaignsApi.create(businessId, body))
    } catch (e) {
      setErrors(getFieldErrors(e))
      setServerError(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const targetOptions =
    dest.needsTarget === 'product'
      ? (products.data ?? []).map((p) => ({ value: p.id, label: p.name }))
      : (offers.data ?? []).map((o) => ({ value: o.id, label: `${o.title}${o.state !== 'Live' ? ` (${o.state.toLowerCase()})` : ''}` }))

  return (
    <Modal
      open
      size="lg"
      title={campaign ? `Edit ${campaign.name}` : 'New QR campaign'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save}>
            {campaign ? 'Save changes' : 'Create QR code'}
          </Button>
        </>
      }
    >
      <div className={styles.editor}>
        <div className={styles.editorFields}>
          {serverError && <Alert tone="error">{serverError}</Alert>}
          <TextField
            label="Name"
            required
            placeholder="e.g. Table 4, Packaging, Festive poster"
            maxLength={80}
            value={form.name}
            error={errors.name}
            onChange={(e) => set({ name: e.target.value })}
          />
          <SelectField
            label="When scanned, open"
            value={form.destination}
            hint={dest.hint}
            onChange={(e) => set({ destination: e.target.value as QrDestination, targetId: null })}
            options={DESTINATIONS.map((d) => ({ value: d.value, label: d.label }))}
          />
          {dest.needsTarget && (
            <SelectField
              label={dest.needsTarget === 'product' ? 'Product' : 'Offer'}
              required
              value={form.targetId ?? ''}
              error={errors.targetId}
              hint={
                (dest.needsTarget === 'product' ? products : offers).loading
                  ? 'Loading…'
                  : targetOptions.length === 0
                    ? `You don’t have any ${dest.needsTarget}s yet.`
                    : undefined
              }
              onChange={(e) => set({ targetId: e.target.value || null })}
              options={[{ value: '', label: `Choose a${dest.needsTarget === 'offer' ? 'n' : ''} ${dest.needsTarget}…` }, ...targetOptions]}
            />
          )}
          <TextField
            label="Ends on (optional)"
            type="datetime-local"
            value={isoToLocalInput(form.expiresAt)}
            error={errors.expiresAt}
            hint="After this, scanners see “this campaign has ended”. Leave empty to keep it running."
            onChange={(e) => set({ expiresAt: localInputToIso(e.target.value) })}
          />
          <label className={styles.toggleRow}>
            <span>
              QR code is on
              <small>Turn off to pause the code without deleting it.</small>
            </span>
            <Toggle checked={form.isEnabled} label="QR code is on" onChange={(v) => set({ isEnabled: v })} />
          </label>
          <StyleFields form={form} set={set} error={errors.colors ?? liveErrors.colors} />
        </div>
        <div className={styles.editorPreview} aria-label="Preview">
          <StyledQr
            url={campaign?.qrUrl ?? 'https://example.com/bq/preview00'}
            foregroundColor={/^#[0-9a-f]{6}$/i.test(form.foregroundColor) ? form.foregroundColor : '#30243D'}
            backgroundColor={/^#[0-9a-f]{6}$/i.test(form.backgroundColor) ? form.backgroundColor : '#FFFFFF'}
            logoUrl={logoUrl}
            showLogo={form.showLogo}
            frameText={form.frameText}
            label={form.name || null}
          />
          {!campaign && <p className={dash.muted}>Preview — your real code is generated when you create it.</p>}
        </div>
      </div>
    </Modal>
  )
}

function BulkCreator({
  businessId,
  logoUrl,
  onClose,
  onSaved,
}: {
  businessId: string
  logoUrl: string | null
  onClose: () => void
  onSaved: (list: QrCampaign[]) => void
}) {
  const [form, setForm] = useState<BulkQrCampaignRequest>({
    namePrefix: 'Table',
    count: 10,
    startNumber: 1,
    destination: 'Products',
    foregroundColor: '#30243D',
    backgroundColor: '#FFFFFF',
    showLogo: true,
    frameText: 'Scan for menu',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (patch: Partial<BulkQrCampaignRequest>) => setForm((f) => ({ ...f, ...patch }))
  const colourError = validateCampaign({ ...emptyCampaign(), ...form, name: 'x' }).colors

  const countValid = Number.isInteger(form.count) && form.count >= 1 && form.count <= 100
  const startValid = Number.isInteger(form.startNumber) && form.startNumber >= 1
  const valid = form.namePrefix.trim() && countValid && startValid && !colourError
  const last = form.startNumber + form.count - 1

  async function save() {
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      onSaved(await qrCampaignsApi.createBulk(businessId, { ...form, namePrefix: form.namePrefix.trim() }))
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      size="lg"
      title="Bulk create QR codes"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button loading={saving} disabled={!valid} onClick={save}>
            Create {countValid ? form.count : ''} codes
          </Button>
        </>
      }
    >
      <div className={styles.editor}>
        <div className={styles.editorFields}>
          {error && <Alert tone="error">{error}</Alert>}
          <p className={dash.muted}>Numbered codes in one go — perfect for restaurant tables, rooms or stands. Each one gets its own scan statistics.</p>
          <TextField label="Name prefix" required maxLength={60} value={form.namePrefix} onChange={(e) => set({ namePrefix: e.target.value })} />
          <div className={dash.formGrid}>
            <TextField
              label="How many"
              type="number"
              min={1}
              max={100}
              value={String(form.count)}
              error={countValid ? undefined : 'Between 1 and 100.'}
              onChange={(e) => set({ count: Number(e.target.value) })}
            />
            <TextField
              label="Start numbering at"
              type="number"
              min={1}
              value={String(form.startNumber)}
              error={startValid ? undefined : 'Must be 1 or more.'}
              onChange={(e) => set({ startNumber: Number(e.target.value) })}
            />
          </div>
          {countValid && startValid && form.namePrefix.trim() && (
            <p className={dash.muted}>
              Creates “{form.namePrefix.trim()} {form.startNumber}” to “{form.namePrefix.trim()} {last}”.
            </p>
          )}
          <SelectField
            label="When scanned, open"
            value={form.destination}
            onChange={(e) => set({ destination: e.target.value as QrDestination })}
            options={DESTINATIONS.filter((d) => d.bulk).map((d) => ({ value: d.value, label: d.label }))}
          />
          <StyleFields form={form} set={(p) => set(p as Partial<BulkQrCampaignRequest>)} error={colourError} />
        </div>
        <div className={styles.editorPreview} aria-label="Preview">
          <StyledQr
            url="https://example.com/bq/preview00"
            foregroundColor={form.foregroundColor}
            backgroundColor={form.backgroundColor}
            logoUrl={logoUrl}
            showLogo={form.showLogo}
            frameText={form.frameText}
            label={`${form.namePrefix.trim() || 'Table'} ${form.startNumber}`}
          />
        </div>
      </div>
    </Modal>
  )
}
