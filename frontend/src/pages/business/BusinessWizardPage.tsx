import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Eye, Rocket, Save } from 'lucide-react'
import { businessApi, businessCategoriesApi } from '../../api/businessApi'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { useAsync } from '../../hooks/useAsync'
import { emptyBusinessForm, toBusinessForm } from '../../lib/business'
import { Button } from '../../components/ui/Button'
import { Alert, Badge, ErrorState, PageLoader } from '../../components/ui/Feedback'
import { GlassCard, Modal } from '../../components/ui/Surface'
import { useToast } from '../../components/ui/Toast'
import { BusinessProfileForm } from '../../components/business/profile/BusinessProfileForm'
import type { PendingBusinessImages } from '../../components/business/profile/BusinessUploaders'
import { BusinessProfilePreview } from '../../components/business/profile/BusinessProfilePreview'
import {
  STEPS,
  buildPreview,
  toPayload,
  validateAll,
  validateStep,
  type FormErrors,
  type WizardStep,
} from '../../components/business/profile/businessForm'
import type { BusinessDetail, BusinessUpsertRequest } from '../../types/business'
import { RequireBusinessRole, useBusiness } from './BusinessShell'
import shared from '../dashboard/Dashboard.module.scss'
import styles from '../../components/business/profile/Profile.module.scss'

const STEP_HELP: Record<WizardStep, string> = {
  1: 'Your name, category and how customers can reach you.',
  2: 'Where customers can find you. Shown with a “Get directions” button.',
  3: 'Opening hours, holidays, delivery options and payments you accept.',
  4: 'Your website and social media profiles.',
  5: 'Make the profile yours — theme, colour, layout and which sections to show.',
}

/** /dashboard/business/new (create) and /dashboard/business/:businessId/profile (edit). */
export default function BusinessWizardPage() {
  const { businessId } = useParams()
  if (!businessId) return <BusinessWizard business={null} />
  return (
    <RequireBusinessRole minimum="Manager">
      <EditWizard />
    </RequireBusinessRole>
  )
}

function EditWizard() {
  const { business, setBusiness } = useBusiness()
  // Keyed by id so switching business resets the form, but saves don't.
  return <BusinessWizard key={business.id} business={business} onSaved={setBusiness} />
}

const ROW_ERROR_PREFIX: Record<string, string | undefined> = {
  workingHours: 'hours.',
  specialHours: 'special.',
  socialLinks: 'social.',
}

const parseStep =(value: string | null): WizardStep => {
  const n = Number(value)
  return n >= 1 && n <= 5 ? (n as WizardStep) : 1
}

function scrollTop() {
  try {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch {
    /* not available (e.g. tests) */
  }
}

function BusinessWizard({ business, onSaved }: { business: BusinessDetail | null; onSaved?: (b: BusinessDetail) => void }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const categories = useAsync(() => businessCategoriesApi.list())
  const saved = useAsync(() => (business ? businessApi.preview(business.id).catch(() => null) : Promise.resolve(null)), [business?.id])

  const [form, setForm] = useState<BusinessUpsertRequest>(() => (business ? toBusinessForm(business) : emptyBusinessForm()))
  const [current, setCurrent] = useState<BusinessDetail | null>(business)
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'next' | 'draft' | 'publish' | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  // Logo / cover picked before the business exists; uploaded right after it is created.
  const [pendingImages, setPendingImages] = useState<PendingBusinessImages>({ logo: null, cover: null })

  const isCreate = !business
  const step: WizardStep = isCreate ? 1 : parseStep(params.get('step'))

  const preview = useMemo(
    () => buildPreview(form, { business: current, saved: saved.data, categories: categories.data }),
    [form, current, saved.data, categories.data],
  )

  if (categories.loading && !categories.data) return <PageLoader label="Loading categories…" />
  if (categories.error) return <ErrorState message={categories.error} onRetry={categories.reload} />

  function set(patch: Partial<BusinessUpsertRequest>) {
    setForm((f) => ({ ...f, ...patch }))
    // Clear errors for the fields being edited (list fields use row-level keys like "hours.Monday").
    const fields = Object.keys(patch)
    setErrors((e) => {
      const next = { ...e }
      for (const key of Object.keys(next)) {
        if (fields.some((f) => key === f || (ROW_ERROR_PREFIX[f] && key.startsWith(ROW_ERROR_PREFIX[f]!)))) delete next[key]
      }
      return next
    })
  }

  function goTo(next: WizardStep) {
    setParams({ step: String(next) }, { replace: true })
    scrollTop()
  }

  function updateBusiness(b: BusinessDetail) {
    setCurrent(b)
    onSaved?.(b)
  }

  /** Validates every step and saves. Returns the saved business, or null when invalid / failed. */
  async function saveAll(): Promise<BusinessDetail | null> {
    const result = validateAll(form)
    if (result.step) {
      setErrors(result.errors)
      if (result.step !== step) goTo(result.step)
      return null
    }
    try {
      const updated = await businessApi.update(current!.id, toPayload(form))
      updateBusiness(updated)
      return updated
    } catch (e) {
      showServerError(e)
      return null
    }
  }

  function showServerError(e: unknown) {
    setErrors(getFieldErrors(e))
    setServerError(getErrorMessage(e))
    scrollTop()
  }

  async function onNext() {
    setServerError(null)
    const stepErrors = validateStep(step, form)
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors)
      return
    }
    setBusy('next')
    try {
      if (isCreate) {
        const created = await businessApi.create(toPayload(form))
        // The business is saved; a failed image upload is reported but never undoes that.
        let failed = 0
        if (pendingImages.logo) await businessApi.uploadLogo(created.id, pendingImages.logo).catch(() => failed++)
        if (pendingImages.cover) await businessApi.uploadCover(created.id, pendingImages.cover).catch(() => failed++)
        if (failed) toast.error(`${created.name} was saved, but ${failed === 2 ? "the images" : "an image"} couldn’t be uploaded. You can add ${failed === 2 ? "them" : "it"} again on this step.`)
        else toast.success(`${created.name} saved as a draft. Add your address and hours next.`)
        navigate(`/dashboard/business/${created.id}/profile?step=2`, { replace: true })
        return
      }
      const updated = await saveAll()
      if (updated) goTo((step + 1) as WizardStep)
    } catch (e) {
      showServerError(e)
    } finally {
      setBusy(null)
    }
  }

  async function onDraft() {
    setServerError(null)
    setBusy('draft')
    const updated = await saveAll()
    setBusy(null)
    if (updated) toast.success(updated.status === 'Published' ? 'Changes saved and live.' : 'Saved as draft.')
  }

  async function onPublish() {
    setServerError(null)
    setBusy('publish')
    const updated = await saveAll()
    if (!updated) {
      setBusy(null)
      return
    }
    try {
      const published = updated.status === 'Published' ? updated : await businessApi.publish(updated.id)
      updateBusiness(published)
      toast.success(updated.status === 'Published' ? 'Changes saved and live.' : `${published.name} is now live! Share your QR code with customers.`)
      navigate(`/dashboard/business/${published.id}`)
    } catch (e) {
      // The changes are saved; only publishing failed (e.g. missing contact details or city).
      setServerError(getErrorMessage(e))
      scrollTop()
    } finally {
      setBusy(null)
    }
  }

  const published = current?.status === 'Published'
  const meta = STEPS.find((s) => s.step === step)!

  return (
    <>
      <div className={shared.pageHeader}>
        <div>
          <h1>{isCreate ? 'Create your business profile' : 'Business profile'}</h1>
          <p>
            {isCreate
              ? 'A separate digital storefront for your shop or service, with its own QR code. Your personal profile stays as it is.'
              : 'Update what customers see on your storefront. Changes go live as soon as you save a published profile.'}
          </p>
        </div>
        <div className={shared.headerActions}>
          {current && <Badge tone={published ? 'green' : 'gray'}>{published ? 'Published' : 'Draft'}</Badge>}
          <Button
            variant="outline"
            size="sm"
            icon={<Eye />}
            className={[styles.previewButton, step === 5 && styles.hideOnWide].filter(Boolean).join(' ')}
            onClick={() => setPreviewOpen(true)}
          >
            Preview
          </Button>
        </div>
      </div>

      <ol className={styles.stepper} aria-label="Profile setup steps">
        {STEPS.map((s) => {
          const reachable = !isCreate || s.step === 1
          const state = s.step === step ? styles.stepCurrent : s.step < step || (!isCreate && s.step !== step) ? styles.stepDone : ''
          return (
            <li key={s.step} className={styles.stepItem}>
              <button
                type="button"
                className={[styles.stepButton, state].filter(Boolean).join(' ')}
                aria-current={s.step === step ? 'step' : undefined}
                aria-label={`Step ${s.step}: ${s.title}`}
                disabled={!reachable || s.step === step}
                onClick={() => goTo(s.step)}
              >
                <span className={styles.stepNumber}>{s.step < step ? <Check aria-hidden /> : s.step}</span>
                <span>{s.short}</span>
              </button>
            </li>
          )
        })}
      </ol>

      <div className={[styles.wizard, step === 5 && styles.wizardWithPreview].filter(Boolean).join(' ')}>
        <GlassCard>
          <div className={styles.stepCaption}>
            <h2>
              Step {step} of 5 · {meta.title}
            </h2>
            <p>{STEP_HELP[step]}</p>
          </div>

          {serverError && (
            <div style={{ marginBottom: 18 }}>
              <Alert tone="error">{serverError}</Alert>
            </div>
          )}

          <BusinessProfileForm
            step={step}
            form={form}
            set={set}
            errors={errors}
            categories={categories.data ?? []}
            business={current}
            onBusinessChange={updateBusiness}
            pendingImages={pendingImages}
            onPendingImagesChange={setPendingImages}
          />

          <div className={styles.actions}>
            {step > 1 && (
              <Button variant="ghost" icon={<ArrowLeft />} onClick={() => goTo((step - 1) as WizardStep)} disabled={busy !== null}>
                Back
              </Button>
            )}
            <span className={styles.spacer} />
            {!isCreate && step < 5 && (
              <Button variant="secondary" icon={<Save />} loading={busy === 'draft'} disabled={busy !== null} onClick={onDraft}>
                {published ? 'Save' : 'Save as draft'}
              </Button>
            )}
            {step < 5 ? (
              <Button iconRight={<ArrowRight />} loading={busy === 'next'} disabled={busy !== null} onClick={onNext}>
                Save & continue
              </Button>
            ) : (
              <>
                {!published && (
                  <Button variant="secondary" icon={<Save />} loading={busy === 'draft'} disabled={busy !== null} onClick={onDraft}>
                    Save as draft
                  </Button>
                )}
                <Button variant={published ? 'primary' : 'premium'} icon={published ? <Save /> : <Rocket />} loading={busy === 'publish'} disabled={busy !== null} onClick={onPublish}>
                  {published ? 'Save changes' : 'Publish profile'}
                </Button>
              </>
            )}
          </div>
        </GlassCard>

        {step === 5 && (
          <aside className={styles.previewPanel} aria-label="Live preview">
            <BusinessProfilePreview business={preview} />
          </aside>
        )}
      </div>

      <Modal open={previewOpen} title="Live preview" size="md" onClose={() => setPreviewOpen(false)}>
        <BusinessProfilePreview business={preview} />
      </Modal>
    </>
  )
}
