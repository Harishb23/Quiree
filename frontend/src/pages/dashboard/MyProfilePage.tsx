import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Camera, Globe, Mail, MapPin, Phone, Save, Trash2, User } from 'lucide-react'
import { profileApi } from '../../api/endpoints'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../context/AuthContext'
import { normalizeUrlInput, safeUrl } from '../../lib/url'
import { Button } from '../../components/ui/Button'
import { TextArea, TextField } from '../../components/ui/Field'
import { Alert, ErrorState, PageLoader } from '../../components/ui/Feedback'
import { CardHeader, GlassCard } from '../../components/ui/Surface'
import { Avatar } from '../../components/ui/Avatar'
import { useToast } from '../../components/ui/Toast'
import { normalizeSocialLinks, SocialLinksEditor } from '../../components/forms/SocialLinksEditor'
import type { Profile, UpdateProfileRequest } from '../../types/api'
import styles from './Dashboard.module.scss'

const MAX_PHOTO_BYTES = 2 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function toForm(p: Profile): UpdateProfileRequest {
  return {
    fullName: p.fullName,
    email: p.email ?? '',
    mobile: p.mobile ?? '',
    location: p.location ?? '',
    website: p.website ?? '',
    summary: p.summary ?? '',
    socialLinks: p.socialLinks,
  }
}

export function validateProfile(form: UpdateProfileRequest): Record<string, string> {
  const e: Record<string, string> = {}
  if (form.fullName.trim().length < 2) e.fullName = 'Full name must be at least 2 characters.'
  if (form.email && !EMAIL_PATTERN.test(form.email.trim())) e.email = 'Enter a valid email address.'
  if (form.mobile && !/^[+\d][\d\s()-]{6,}$/.test(form.mobile.trim())) e.mobile = 'Enter a valid phone number.'
  if (form.website && !safeUrl(normalizeUrlInput(form.website))) e.website = 'Enter a valid website URL.'
  if ((form.summary ?? '').length > 2000) e.summary = 'Summary must be 2000 characters or fewer.'
  return e
}

export default function MyProfilePage() {
  const toast = useToast()
  const { updateUser } = useAuth()
  const profile = useAsync(() => profileApi.get())
  const [form, setForm] = useState<UpdateProfileRequest | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile.data) setForm(toForm(profile.data))
  }, [profile.data])

  if (profile.loading && !profile.data) return <PageLoader label="Loading your profile…" />
  if (profile.error || !profile.data || !form) return <ErrorState message={profile.error ?? 'Unknown error'} onRetry={profile.reload} />

  const current = profile.data
  const set = (key: keyof UpdateProfileRequest) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => (f ? { ...f, [key]: e.target.value } : f))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    const payload: UpdateProfileRequest = {
      ...form,
      fullName: form.fullName.trim(),
      website: form.website ? normalizeUrlInput(form.website) : null,
      email: form.email?.trim() || null,
      mobile: form.mobile?.trim() || null,
      location: form.location?.trim() || null,
      summary: form.summary?.trim() || null,
      socialLinks: normalizeSocialLinks(form.socialLinks),
    }
    const v = validateProfile(payload)
    payload.socialLinks.forEach((l, i) => {
      if (!safeUrl(l.url)) v[`socialLinks[${i}]`] = 'Enter a valid link.'
    })
    setErrors(v)
    if (Object.keys(v).length) {
      setError('Please fix the highlighted fields.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const saved = await profileApi.update(payload)
      profile.setData(saved)
      updateUser({ fullName: saved.fullName })
      toast.success('Profile saved.')
    } catch (err) {
      setErrors(getFieldErrors(err))
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function onPhotoSelected(file: File | undefined) {
    if (!file) return
    if (!PHOTO_TYPES.includes(file.type)) return toast.error('Please choose a JPG, PNG or WEBP image.')
    if (file.size > MAX_PHOTO_BYTES) return toast.error('Profile photo must be 2 MB or smaller.')
    setUploading(true)
    try {
      const saved = await profileApi.uploadPhoto(file)
      profile.setData(saved)
      updateUser({ photoUrl: saved.photoUrl })
      toast.success('Photo updated.')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function onRemovePhoto() {
    setUploading(true)
    try {
      const saved = await profileApi.removePhoto()
      profile.setData(saved)
      updateUser({ photoUrl: null })
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  const socialErrors = Object.fromEntries(
    Object.entries(errors)
      .filter(([k]) => k.startsWith('socialLinks['))
      .map(([k, v]) => [Number(k.match(/\d+/)?.[0]), v]),
  )

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className={styles.pageHeader}>
        <div>
          <h1>My Profile</h1>
          <p>Your main details are shared by every profile mode unless a mode overrides them.</p>
        </div>
        <Button type="submit" loading={saving} icon={<Save />}>
          Save profile
        </Button>
      </div>

      <div className={styles.stack}>
        {error && <Alert>{error}</Alert>}

        <GlassCard>
          <CardHeader title="Profile photo" subtitle="JPG, PNG or WEBP up to 2 MB. A square photo works best." />
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <Avatar name={form.fullName || current.fullName} photoUrl={current.photoUrl} size={96} />
            <input
              ref={fileRef}
              type="file"
              accept={PHOTO_TYPES.join(',')}
              hidden
              onChange={(e) => onPhotoSelected(e.target.files?.[0])}
              data-testid="photo-input"
            />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button icon={<Camera />} loading={uploading} onClick={() => fileRef.current?.click()}>
                {current.photoUrl ? 'Change photo' : 'Upload photo'}
              </Button>
              {current.photoUrl && (
                <Button variant="ghost" icon={<Trash2 />} disabled={uploading} onClick={onRemovePhoto}>
                  Remove
                </Button>
              )}
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <CardHeader title="Personal details" subtitle="These details appear on your public profile and saved contact card." />
          <div className={styles.formGrid}>
            <TextField label="Full name" icon={<User />} value={form.fullName} onChange={set('fullName')} error={errors.fullName} required maxLength={100} />
            <TextField
              label="Public contact email"
              type="email"
              icon={<Mail />}
              value={form.email ?? ''}
              onChange={set('email')}
              error={errors.email}
              hint="Shown to viewers. Your login email stays private."
            />
            <TextField label="Mobile number" type="tel" icon={<Phone />} value={form.mobile ?? ''} onChange={set('mobile')} error={errors.mobile} maxLength={30} />
            <TextField label="Location" icon={<MapPin />} value={form.location ?? ''} onChange={set('location')} error={errors.location} maxLength={150} placeholder="City, Country" />
            <TextField
              className={styles.span2}
              label="Personal website"
              icon={<Globe />}
              value={form.website ?? ''}
              onChange={set('website')}
              error={errors.website}
              placeholder="yourwebsite.com"
            />
            <TextArea
              className={styles.span2}
              label="Professional summary"
              rows={5}
              value={form.summary ?? ''}
              onChange={set('summary')}
              error={errors.summary}
              maxLength={2000}
              hint={`${(form.summary ?? '').length}/2000 · Used when a mode has no summary of its own.`}
            />
          </div>
        </GlassCard>

        <GlassCard>
          <CardHeader title="Social links" subtitle="Shown on all modes. A mode can override a platform with its own link." />
          <SocialLinksEditor
            value={form.socialLinks}
            onChange={(socialLinks) => setForm((f) => (f ? { ...f, socialLinks } : f))}
            errors={socialErrors}
          />
        </GlassCard>

        <div>
          <Button type="submit" loading={saving} icon={<Save />}>
            Save profile
          </Button>
        </div>
      </div>
    </form>
  )
}
