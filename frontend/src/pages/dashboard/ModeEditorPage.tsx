import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Eye, Lock, Save } from 'lucide-react'
import { modesApi, profileApi, templatesApi } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { modeTypeOptions, modeTypes } from '../../lib/modeTypes'
import { Button } from '../../components/ui/Button'
import { SelectField, TextArea, TextField } from '../../components/ui/Field'
import { Alert, ErrorState, PageLoader } from '../../components/ui/Feedback'
import { CardHeader, GlassCard, Modal, Toggle } from '../../components/ui/Surface'
import { useToast } from '../../components/ui/Toast'
import { SocialLinksEditor } from '../../components/forms/SocialLinksEditor'
import { DEFAULT_TEMPLATE_KEY } from '../../templates'
import type { ModeType, Profile, TemplateInfo } from '../../types/api'
import { emptyModeForm, formFromDetail, previewModeFromForm, toPayload, validateMode, type ModeForm } from './modeEditor/modeForm'
import {
  AchievementsEditor,
  CertificationsEditor,
  CustomSectionsEditor,
  EducationEditor,
  ExperienceEditor,
  ProjectsEditor,
  ServicesEditor,
  SkillsEditor,
} from './modeEditor/SectionEditors'
import { ProfilePreview } from './ModePreviewModal'
import styles from './Dashboard.module.scss'
import local from './ModeEditorPage.module.scss'

const SECTIONS = [
  ['basics', 'Basics'],
  ['contact', 'Contact'],
  ['role', 'Role details'],
  ['skills', 'Skills'],
  ['experience', 'Experience'],
  ['education', 'Education'],
  ['projects', 'Projects'],
  ['achievements', 'Achievements'],
  ['certifications', 'Certifications'],
  ['services', 'Services'],
  ['custom', 'Custom sections'],
  ['social', 'Social links'],
] as const

export default function ModeEditorPage() {
  const { modeId } = useParams()
  const [params] = useSearchParams()
  const isNew = !modeId
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()

  const [form, setForm] = useState<ModeForm | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [templates, setTemplates] = useState<TemplateInfo[]>([])
  const [profile, setProfile] = useState<Profile>()
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    const typeParam = params.get('type') as ModeType | null
    const load = isNew
      ? Promise.resolve(emptyModeForm(typeParam && typeParam in modeTypes ? typeParam : 'General'))
      : modesApi.get(modeId!).then(formFromDetail)
    load.then((f) => !cancelled && setForm(f)).catch((e) => !cancelled && setLoadError(getErrorMessage(e)))
    templatesApi.list().then((t) => !cancelled && setTemplates(t)).catch(() => {})
    profileApi.get().then((p) => !cancelled && setProfile(p)).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isNew, modeId, params])

  const templateKey = useMemo(
    () => templates.find((t) => t.id === form?.templateId)?.key ?? DEFAULT_TEMPLATE_KEY,
    [templates, form?.templateId],
  )

  if (loadError) return <ErrorState message={loadError} onRetry={() => navigate(0)} />
  if (!form) return <PageLoader label="Loading mode…" />

  const meta = modeTypes[form.modeType]
  const patch = (p: Partial<ModeForm>) => setForm((f) => (f ? { ...f, ...p } : f))
  const text = (key: keyof ModeForm) => ({
    value: (form[key] as string | null) ?? '',
    error: errors[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => patch({ [key]: e.target.value }),
  })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    const payload = toPayload(form)
    const v = validateMode(payload)
    setErrors(v)
    if (Object.keys(v).length) {
      setError('Please fix the highlighted fields.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        const created = await modesApi.create(payload)
        toast.success(`${created.modeName} created.`)
        navigate(`/dashboard/modes/${created.id}`, { replace: true })
      } else {
        const saved = await modesApi.update(modeId!, payload)
        setForm(formFromDetail(saved))
        toast.success('Changes saved. Your QR code is unchanged.')
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const isEntrepreneur = form.modeType === 'Entrepreneur' || form.modeType === 'Consultant'
  const isDeveloper = form.modeType === 'Developer'
  const projectsLabel = form.modeType === 'Marketing' ? 'Marketing projects & campaigns' : 'Projects'
  const outcomeLabel = form.modeType === 'Marketing' ? 'Campaign results' : 'Outcome / results'
  const achievementsLabel =
    form.modeType === 'HR' ? 'HR achievements' : form.modeType === 'Marketing' ? 'Marketing achievements' : form.modeType === 'Entrepreneur' ? 'Business achievements' : 'Achievements'
  const servicesLabel = isEntrepreneur ? 'Products & services' : 'Services'

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className={styles.pageHeader}>
        <div>
          <Link to="/dashboard/modes" className={local.back}>
            <ArrowLeft /> All modes
          </Link>
          <h1>{isNew ? 'Create profile mode' : `Edit ${form.modeName || 'mode'}`}</h1>
          <p>Each mode has its own independent resume. Only published modes are visible to viewers.</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" icon={<Eye />} onClick={() => setPreviewOpen(true)}>
            Live preview
          </Button>
          <Button type="submit" loading={saving} icon={<Save />}>
            {isNew ? 'Create mode' : 'Save changes'}
          </Button>
        </div>
      </div>

      <div className={local.layout}>
        <nav className={local.sectionNav} aria-label="Sections">
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>

        <div className={styles.stack}>
          {error && <Alert>{error}</Alert>}

          <Section id="basics" title="Basics" subtitle="Name this identity and describe the role.">
            <div className={styles.formGrid}>
              <SelectField
                label="Professional role"
                options={modeTypeOptions}
                value={form.modeType}
                onChange={(e) => {
                  const modeType = e.target.value as ModeType
                  const wasDefaultName = Object.values(modeTypes).some((m) => m.defaultName === form.modeName)
                  patch({ modeType, ...(wasDefaultName || !form.modeName ? { modeName: modeTypes[modeType].defaultName } : {}) })
                }}
              />
              <TextField label="Mode name" required maxLength={60} hint="Shown to viewers when switching modes." {...text('modeName')} />
              <TextField label="Designation" maxLength={120} placeholder={meta.defaultName} {...text('designation')} />
              <TextField label="Company" maxLength={150} {...text('companyName')} />
              <TextArea className={styles.span2} label="Professional summary" rows={5} maxLength={3000} hint="Leave empty to use the summary from My Profile." {...text('summary')} />
              <div className={`${styles.span2} ${local.publishRow}`}>
                <div>
                  <strong>Published</strong>
                  <span>Visible on your public profile and selectable by viewers.</span>
                </div>
                <Toggle checked={form.isPublished} label="Published" onChange={(isPublished) => patch({ isPublished })} />
              </div>
              {isNew && templates.length > 0 && (
                <SelectField
                  className={styles.span2}
                  label="Template"
                  hint={
                    <>
                      You can change it any time in <Link to="/dashboard/templates">Templates</Link>.
                    </>
                  }
                  value={String(form.templateId ?? '')}
                  onChange={(e) => patch({ templateId: e.target.value ? Number(e.target.value) : null })}
                  options={[
                    { value: '', label: 'Default (Modern Glass)' },
                    ...templates.map((t) => ({ value: String(t.id), label: `${t.name}${t.isLocked ? ' 🔒 Premium' : ''}` })),
                  ]}
                />
              )}
            </div>
          </Section>

          <Section id="contact" title="Contact information" subtitle="Overrides your main profile for this mode. Leave empty to inherit.">
            <div className={styles.formGrid}>
              <TextField label="Email" type="email" placeholder={profile?.email ?? ''} {...text('contactEmail')} />
              <TextField label="Phone" type="tel" placeholder={profile?.mobile ?? ''} maxLength={30} {...text('contactPhone')} />
              <TextField label="Location" placeholder={profile?.location ?? ''} maxLength={150} {...text('location')} />
              <TextField label="Website" placeholder={profile?.website ?? ''} {...text('website')} />
            </div>
          </Section>

          <Section id="role" title={`${meta.label} details`} subtitle="Role-specific information.">
            <div className={styles.formGrid}>
              {isEntrepreneur && (
                <>
                  <TextField label="Business name" maxLength={150} {...text('businessName')} />
                  <TextField label="Industry" maxLength={100} {...text('industry')} />
                  <TextField className={styles.span2} label="Company website" {...text('companyWebsite')} />
                  <TextArea className={styles.span2} label="Business description" rows={4} maxLength={3000} {...text('businessDescription')} />
                </>
              )}
              {isDeveloper && <TextField className={styles.span2} label="GitHub profile" placeholder="github.com/username" {...text('gitHubUrl')} />}
              {!isEntrepreneur && !isDeveloper && (
                <>
                  <TextField label="Industry" maxLength={100} {...text('industry')} />
                  <TextField label="Company website" {...text('companyWebsite')} />
                </>
              )}
              <p className={`${styles.span2} ${styles.muted}`}>
                Tip: use the Skills section categories ({meta.skillCategories.slice(0, 3).join(', ')}…) to highlight your{' '}
                {meta.label.toLowerCase()} expertise.
              </p>
            </div>
          </Section>

          <Section id="skills" title="Skills & expertise" subtitle="Grouped by category on your resume.">
            <SkillsEditor key={form.modeType} skills={form.skills} onChange={(skills) => patch({ skills })} suggestedCategories={meta.skillCategories} />
          </Section>

          <Section id="experience" title={form.modeType === 'Entrepreneur' ? 'Business experience' : 'Work experience'}>
            <ExperienceEditor items={form.workExperiences} onChange={(workExperiences) => patch({ workExperiences })} errors={errors} />
          </Section>

          <Section id="education" title="Education">
            <EducationEditor items={form.educations} onChange={(educations) => patch({ educations })} errors={errors} />
          </Section>

          <Section id="projects" title={projectsLabel}>
            <ProjectsEditor items={form.projects} onChange={(projects) => patch({ projects })} errors={errors} outcomeLabel={outcomeLabel} />
          </Section>

          <Section id="achievements" title={achievementsLabel}>
            <AchievementsEditor items={form.achievements} onChange={(achievements) => patch({ achievements })} errors={errors} />
          </Section>

          <Section id="certifications" title="Certifications">
            <CertificationsEditor items={form.certifications} onChange={(certifications) => patch({ certifications })} errors={errors} />
          </Section>

          <Section id="services" title={servicesLabel}>
            <ServicesEditor items={form.services} onChange={(services) => patch({ services })} errors={errors} label={isEntrepreneur ? 'Product or service' : 'Service'} />
          </Section>

          <Section id="custom" title="Custom sections" subtitle="Optional extra sections.">
            <CustomSectionsEditor items={form.customSections} onChange={(customSections) => patch({ customSections })} errors={errors} />
          </Section>

          <Section id="social" title="Social links for this mode" subtitle="Overrides the same platform from My Profile.">
            <SocialLinksEditor
              value={form.socialLinks}
              onChange={(socialLinks) => patch({ socialLinks })}
              errors={Object.fromEntries(Object.entries(errors).filter(([k]) => k.startsWith('socialLinks.')).map(([k, v]) => [Number(k.split('.')[1]), v]))}
            />
          </Section>

          <div className={styles.headerActions}>
            <Button type="submit" loading={saving} icon={<Save />}>
              {isNew ? 'Create mode' : 'Save changes'}
            </Button>
            {templates.find((t) => t.id === form.templateId)?.isLocked && (
              <span className={styles.muted}>
                <Lock size={14} /> The selected template requires a premium plan.
              </span>
            )}
          </div>
        </div>
      </div>

      <Modal open={previewOpen} title="Live preview (unsaved changes)" size="xl" onClose={() => setPreviewOpen(false)}>
        <ProfilePreview
          profile={{
            fullName: profile?.fullName ?? user?.fullName ?? '',
            photoUrl: profile?.photoUrl ?? user?.photoUrl ?? null,
            permanentUrl: user?.publicUrl ?? '',
          }}
          mode={previewModeFromForm(toPayload(form), profile, templateKey)}
        />
      </Modal>
    </form>
  )
}

function Section({ id, title, subtitle, children }: { id: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <GlassCard id={id} className={local.section}>
      <CardHeader title={title} subtitle={subtitle} />
      {children}
    </GlassCard>
  )
}
