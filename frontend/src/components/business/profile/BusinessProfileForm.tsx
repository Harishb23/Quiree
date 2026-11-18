import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, Globe, LocateFixed, MapPin, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../ui/Button'
import { SelectField, TextArea, TextField } from '../../ui/Field'
import { Toggle } from '../../ui/Surface'
import { PAYMENT_METHODS, SECTIONS, SOCIAL_PLATFORMS, THEMES } from '../../../lib/business'
import type {
  BusinessCategory,
  BusinessDetail,
  BusinessLayout,
  BusinessSocialPlatform,
  BusinessUpsertRequest,
  PaymentMethod,
  SectionKey,
} from '../../../types/business'
import { BusinessCategorySelector } from './BusinessCategorySelector'
import { BusinessContactInformation } from './BusinessContactInformation'
import { BusinessCoverUploader, BusinessLogoUploader, type PendingBusinessImages } from './BusinessUploaders'
import { BusinessWorkingHours } from './BusinessWorkingHours'
import { sectionRows, type FormErrors, type WizardStep } from './businessForm'
import styles from './Profile.module.scss'

export interface StepProps {
  form: BusinessUpsertRequest
  set: (patch: Partial<BusinessUpsertRequest>) => void
  errors: FormErrors
}

// ---------------------------------------------------------------------------
// Step 1 — basics
// ---------------------------------------------------------------------------

export function StepBasics({
  form,
  set,
  errors,
  categories,
  business,
  onBusinessChange,
  pendingImages,
  onPendingImagesChange,
}: StepProps & {
  categories: BusinessCategory[]
  business: BusinessDetail | null
  onBusinessChange: (b: BusinessDetail) => void
  pendingImages?: PendingBusinessImages
  onPendingImagesChange?: (images: PendingBusinessImages) => void
}) {
  const pending = pendingImages ?? { logo: null, cover: null }
  return (
    <div className={styles.stack}>
      <TextField
        label="Business name"
        required
        maxLength={120}
        placeholder="e.g. Sole Street Footwear"
        value={form.name}
        error={errors.name}
        onChange={(e) => set({ name: e.target.value })}
      />
      <BusinessCategorySelector
        categories={categories}
        categoryId={form.categoryId}
        subcategoryId={form.subcategoryId}
        error={errors.categoryId}
        onChange={(categoryId, subcategoryId) => set({ categoryId, subcategoryId })}
      />
      <TextArea
        label="Business description"
        rows={4}
        maxLength={3000}
        placeholder="What do you sell or offer? What makes your business special?"
        value={form.description ?? ''}
        error={errors.description}
        hint={`${(form.description ?? '').length}/3000`}
        onChange={(e) => set({ description: e.target.value })}
      />
      <div className={styles.grid2}>
        <TextField
          label="Year established"
          inputMode="numeric"
          maxLength={4}
          placeholder="e.g. 2012"
          value={form.yearEstablished?.toString() ?? ''}
          error={errors.yearEstablished}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '')
            set({ yearEstablished: v ? Number(v) : null })
          }}
        />
      </div>
      <BusinessContactInformation form={form} set={set} errors={errors} />
      <div className={styles.uploadRow}>
        <BusinessLogoUploader
          business={business}
          onChange={onBusinessChange}
          pendingFile={pending.logo}
          onPendingChange={onPendingImagesChange && ((logo) => onPendingImagesChange({ ...pending, logo }))}
        />
        <BusinessCoverUploader
          business={business}
          onChange={onBusinessChange}
          pendingFile={pending.cover}
          onPendingChange={onPendingImagesChange && ((cover) => onPendingImagesChange({ ...pending, cover }))}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — address
// ---------------------------------------------------------------------------

const parseCoord = (v: string): number | null => (v.trim() === '' ? null : Number(v))

export function StepAddress({ form, set, errors }: StepProps) {
  // Coordinates are edited as text so partial input like "12." isn't reformatted while typing.
  const [lat, setLat] = useState(form.latitude?.toString() ?? '')
  const [lng, setLng] = useState(form.longitude?.toString() ?? '')
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  function locate() {
    if (!navigator.geolocation) {
      setGeoError('Location isn’t available in this browser.')
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = Number(pos.coords.latitude.toFixed(6))
        const lo = Number(pos.coords.longitude.toFixed(6))
        setLat(String(la))
        setLng(String(lo))
        set({ latitude: la, longitude: lo })
        setLocating(false)
      },
      () => {
        setGeoError('Couldn’t get your location. Check the browser’s location permission, or enter it manually.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className={styles.stack}>
      <div className={styles.grid2}>
        <TextField className={styles.span2} label="Address line 1" autoComplete="address-line1" maxLength={200} placeholder="Shop no., building, street" value={form.addressLine1 ?? ''} onChange={(e) => set({ addressLine1: e.target.value })} />
        <TextField className={styles.span2} label="Address line 2" autoComplete="address-line2" maxLength={200} placeholder="Area, landmark (optional)" value={form.addressLine2 ?? ''} onChange={(e) => set({ addressLine2: e.target.value })} />
        <TextField label="City" autoComplete="address-level2" maxLength={100} value={form.city ?? ''} hint="Needed before you can publish." onChange={(e) => set({ city: e.target.value })} />
        <TextField label="State" autoComplete="address-level1" maxLength={100} value={form.state ?? ''} onChange={(e) => set({ state: e.target.value })} />
        <TextField label="Country" autoComplete="country-name" maxLength={100} value={form.country ?? ''} onChange={(e) => set({ country: e.target.value })} />
        <TextField label="Postal code" autoComplete="postal-code" inputMode="numeric" maxLength={20} value={form.postalCode ?? ''} onChange={(e) => set({ postalCode: e.target.value })} />
      </div>
      <TextField
        label="Google Maps link"
        icon={<MapPin />}
        placeholder="maps.app.goo.gl/…"
        value={form.mapsUrl ?? ''}
        error={errors.mapsUrl}
        hint="Open your shop in Google Maps → Share → Copy link. Used for the “Get directions” button."
        onChange={(e) => set({ mapsUrl: e.target.value })}
      />
      <div className={styles.coordBox}>
        <div className={styles.sectionHead}>
          <div>
            <h3>Map coordinates (optional)</h3>
            <p>Pin your exact location. Use this while you’re at the shop.</p>
          </div>
          <Button size="sm" variant="outline" icon={<LocateFixed />} loading={locating} onClick={locate}>
            Use my current location
          </Button>
        </div>
        <div className={styles.grid2}>
          <TextField
            label="Latitude"
            inputMode="decimal"
            placeholder="13.0827"
            value={lat}
            error={errors.latitude}
            onChange={(e) => {
              setLat(e.target.value)
              set({ latitude: parseCoord(e.target.value) })
            }}
          />
          <TextField
            label="Longitude"
            inputMode="decimal"
            placeholder="80.2707"
            value={lng}
            error={errors.longitude}
            onChange={(e) => {
              setLng(e.target.value)
              set({ longitude: parseCoord(e.target.value) })
            }}
          />
        </div>
        {geoError && (
          <p className={styles.error} role="alert">
            {geoError}
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — operations
// ---------------------------------------------------------------------------

export function StepOperations({ form, set, errors }: StepProps) {
  const togglePayment = (m: PaymentMethod) =>
    set({ paymentMethods: form.paymentMethods.includes(m) ? form.paymentMethods.filter((p) => p !== m) : [...form.paymentMethods, m] })

  return (
    <div className={styles.stack}>
      <BusinessWorkingHours
        hours={form.workingHours}
        special={form.specialHours}
        errors={errors}
        onHours={(workingHours) => set({ workingHours })}
        onSpecial={(specialHours) => set({ specialHours })}
      />
      <div className={styles.sectionHead}>
        <div>
          <h3>Delivery & pickup</h3>
        </div>
      </div>
      <div className={styles.toggleRows}>
        <div className={styles.toggleRow}>
          <div>
            <strong>Home delivery available</strong>
            <span>Customers can ask for delivery.</span>
          </div>
          <Toggle checked={form.deliveryAvailable} label="Home delivery available" onChange={(v) => set({ deliveryAvailable: v })} />
        </div>
        <div className={styles.toggleRow}>
          <div>
            <strong>In-store pickup available</strong>
            <span>Customers can order ahead and collect.</span>
          </div>
          <Toggle checked={form.pickupAvailable} label="In-store pickup available" onChange={(v) => set({ pickupAvailable: v })} />
        </div>
      </div>
      <div className={styles.sectionHead}>
        <div>
          <h3>Payment methods accepted</h3>
        </div>
      </div>
      <div className={styles.chips} role="group" aria-label="Payment methods accepted">
        {PAYMENT_METHODS.map((m) => {
          const on = form.paymentMethods.includes(m.value)
          return (
            <button key={m.value} type="button" aria-pressed={on} className={[styles.chip, on && styles.chipOn].filter(Boolean).join(' ')} onClick={() => togglePayment(m.value)}>
              {on && <Check aria-hidden />}
              {m.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4 — online presence
// ---------------------------------------------------------------------------

export function StepOnline({ form, set, errors }: StepProps) {
  const used = new Set(form.socialLinks.map((l) => l.platform))
  const nextPlatform = SOCIAL_PLATFORMS.find((p) => p.value === 'Other' || !used.has(p.value))!.value
  const update = (i: number, patch: Partial<BusinessUpsertRequest['socialLinks'][number]>) =>
    set({ socialLinks: form.socialLinks.map((l, j) => (j === i ? { ...l, ...patch } : l)) })

  return (
    <div className={styles.stack}>
      <TextField
        label="Website (optional)"
        icon={<Globe />}
        placeholder="yourshop.com"
        value={form.website ?? ''}
        error={errors.website}
        onChange={(e) => set({ website: e.target.value })}
      />
      <div className={styles.sectionHead}>
        <div>
          <h3>Social media</h3>
          <p>Add the profiles customers can follow. Bare links like instagram.com/yourshop are fine.</p>
        </div>
      </div>
      {form.socialLinks.length === 0 && <p className={styles.emptyHint}>No social links yet.</p>}
      <ul className={styles.socialList}>
        {form.socialLinks.map((link, i) => {
          const meta = SOCIAL_PLATFORMS.find((p) => p.value === link.platform)
          return (
            <li key={i} className={styles.socialRow}>
              <SelectField
                label="Platform"
                value={link.platform}
                onChange={(e) => update(i, { platform: e.target.value as BusinessSocialPlatform })}
                options={SOCIAL_PLATFORMS.map((p) => ({ value: p.value, label: p.label }))}
              />
              {link.platform === 'Other' && (
                <TextField label="Label" maxLength={50} placeholder="e.g. Zomato" value={link.label ?? ''} onChange={(e) => update(i, { label: e.target.value })} />
              )}
              <TextField
                className={styles.socialUrl}
                label="Link"
                placeholder={meta?.placeholder}
                value={link.url}
                error={errors[`social.${i}`]}
                onChange={(e) => update(i, { url: e.target.value })}
              />
              <button type="button" className={styles.iconRemove} aria-label={`Remove ${meta?.label ?? 'link'}`} onClick={() => set({ socialLinks: form.socialLinks.filter((_, j) => j !== i) })}>
                <Trash2 />
              </button>
            </li>
          )
        })}
      </ul>
      <div>
        <Button
          size="sm"
          variant="outline"
          icon={<Plus />}
          disabled={form.socialLinks.length >= 12}
          onClick={() => set({ socialLinks: [...form.socialLinks, { platform: nextPlatform, label: null, url: '' }] })}
        >
          Add social link
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 5 — customise
// ---------------------------------------------------------------------------

const SWATCHES = ['#6B3FA0', '#452269', '#D4A94F', '#1F7A5C', '#0F766E', '#1D4ED8', '#BE185D', '#C2410C', '#30243D']

export function StepCustomise({ form, set, errors }: StepProps) {
  const rows = sectionRows(form.featuredSections)
  const move = (key: SectionKey, delta: -1 | 1) => {
    const list = [...form.featuredSections]
    const i = list.indexOf(key)
    const j = i + delta
    if (i < 0 || j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j]!, list[i]!]
    set({ featuredSections: list })
  }
  const toggle = (key: SectionKey, on: boolean) =>
    set({ featuredSections: on ? [...form.featuredSections, key] : form.featuredSections.filter((k) => k !== key) })
  const hexValid = /^#[0-9A-Fa-f]{6}$/.test(form.brandColor)

  return (
    <div className={styles.stack}>
      <div>
        <div className={styles.sectionHead}>
          <div>
            <h3>Profile theme</h3>
          </div>
        </div>
        <div className={styles.themeGrid} role="radiogroup" aria-label="Profile theme">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={form.theme === t.value}
              className={[styles.themeCard, form.theme === t.value && styles.themeActive].filter(Boolean).join(' ')}
              onClick={() => set({ theme: t.value })}
            >
              <span className={[styles.themeSwatch, styles[`theme_${t.value}`]].join(' ')} style={{ ['--brand' as string]: hexValid ? form.brandColor : '#6B3FA0' }} aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <strong>{t.label}</strong>
              <span>{t.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className={styles.sectionHead}>
          <div>
            <h3>Brand colour</h3>
            <p>Used for buttons, highlights and your header.</p>
          </div>
        </div>
        <div className={styles.colorRow}>
          <input
            type="color"
            className={styles.colorPicker}
            aria-label="Pick brand colour"
            value={hexValid ? form.brandColor : '#6B3FA0'}
            onChange={(e) => set({ brandColor: e.target.value.toUpperCase() })}
          />
          <TextField label="Hex colour" maxLength={7} value={form.brandColor} error={errors.brandColor} onChange={(e) => set({ brandColor: e.target.value.trim() })} />
          <div className={styles.swatches} role="group" aria-label="Suggested colours">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                className={[styles.swatch, form.brandColor.toUpperCase() === c && styles.swatchOn].filter(Boolean).join(' ')}
                style={{ background: c }}
                aria-label={`Use ${c}`}
                aria-pressed={form.brandColor.toUpperCase() === c}
                onClick={() => set({ brandColor: c })}
              />
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className={styles.sectionHead}>
          <div>
            <h3>Product layout</h3>
          </div>
        </div>
        <div className={styles.chips} role="radiogroup" aria-label="Product layout">
          {(['grid', 'list'] as BusinessLayout[]).map((l) => (
            <button key={l} type="button" role="radio" aria-checked={form.layout === l} className={[styles.chip, form.layout === l && styles.chipOn].filter(Boolean).join(' ')} onClick={() => set({ layout: l })}>
              {form.layout === l && <Check aria-hidden />}
              {l === 'grid' ? 'Grid of cards' : 'Compact list'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className={styles.sectionHead}>
          <div>
            <h3>Featured sections</h3>
            <p>Choose which sections appear on your profile, and in what order.</p>
          </div>
        </div>
        <ol className={styles.sectionList}>
          {rows.map(({ key, on }, idx) => {
            const label = SECTIONS.find((s) => s.key === key)!.label
            const position = form.featuredSections.indexOf(key)
            return (
              <li key={key} className={[styles.sectionRow, !on && styles.sectionOff].filter(Boolean).join(' ')}>
                <Toggle checked={on} label={`Show ${label}`} onChange={(v) => toggle(key, v)} />
                <span className={styles.sectionName}>{label}</span>
                {on && (
                  <span className={styles.sectionMove}>
                    <button type="button" className={styles.iconRemove} aria-label={`Move ${label} up`} disabled={position === 0} onClick={() => move(key, -1)}>
                      <ArrowUp />
                    </button>
                    <button
                      type="button"
                      className={styles.iconRemove}
                      aria-label={`Move ${label} down`}
                      disabled={position === form.featuredSections.length - 1}
                      onClick={() => move(key, 1)}
                    >
                      <ArrowDown />
                    </button>
                  </span>
                )}
                <span className="sr-only">{on ? `Position ${idx + 1}` : 'Hidden'}</span>
              </li>
            )
          })}
        </ol>
        {errors.featuredSections && (
          <p className={styles.error} role="alert">
            {errors.featuredSections}
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step switcher
// ---------------------------------------------------------------------------

export function BusinessProfileForm(
  props: StepProps & {
    step: WizardStep
    categories: BusinessCategory[]
    business: BusinessDetail | null
    onBusinessChange: (b: BusinessDetail) => void
    pendingImages?: PendingBusinessImages
    onPendingImagesChange?: (images: PendingBusinessImages) => void
  },
) {
  const { step, categories, business, onBusinessChange, pendingImages, onPendingImagesChange, ...rest } = props
  switch (step) {
    case 1:
      return (
        <StepBasics
          {...rest}
          categories={categories}
          business={business}
          onBusinessChange={onBusinessChange}
          pendingImages={pendingImages}
          onPendingImagesChange={onPendingImagesChange}
        />
      )
    case 2:
      return <StepAddress {...rest} />
    case 3:
      return <StepOperations {...rest} />
    case 4:
      return <StepOnline {...rest} />
    default:
      return <StepCustomise {...rest} />
  }
}
