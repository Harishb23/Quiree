import { useEffect, useState } from 'react'
import { Check, Crown, Eye, Layers, Lock, Plus } from 'lucide-react'
import { modesApi, templatesApi } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { useAsync } from '../../hooks/useAsync'
import { Button } from '../../components/ui/Button'
import { SelectField } from '../../components/ui/Field'
import { Badge, EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback'
import { GlassCard, Modal } from '../../components/ui/Surface'
import { useToast } from '../../components/ui/Toast'
import { TemplateThumbnail } from '../../templates'
import type { PublicProfile, TemplateInfo } from '../../types/api'
import { ProfilePreview } from './ModePreviewModal'
import styles from './Dashboard.module.scss'
import local from './TemplatesPage.module.scss'

export default function TemplatesPage() {
  const toast = useToast()
  const modes = useAsync(() => modesApi.list())
  const templates = useAsync(() => templatesApi.list())
  const [modeId, setModeId] = useState<string>('')
  const [preview, setPreview] = useState<PublicProfile | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [selecting, setSelecting] = useState<number | null>(null)
  const [livePreview, setLivePreview] = useState<TemplateInfo | null>(null)

  // Default to the default mode once modes are loaded.
  useEffect(() => {
    if (!modeId && modes.data?.length) setModeId((modes.data.find((m) => m.isDefault) ?? modes.data[0]!).id)
  }, [modes.data, modeId])

  // The gallery renders every template with the selected mode's real data.
  useEffect(() => {
    if (!modeId) return
    let cancelled = false
    setPreview(null)
    setPreviewError(null)
    modesApi
      .preview(modeId)
      .then((p) => !cancelled && setPreview(p))
      .catch((e) => !cancelled && setPreviewError(getErrorMessage(e)))
    return () => {
      cancelled = true
    }
  }, [modeId])

  if ((modes.loading && !modes.data) || (templates.loading && !templates.data)) return <PageLoader label="Loading templates…" />
  if (modes.error || templates.error) {
    return (
      <ErrorState
        message={modes.error ?? templates.error ?? ''}
        onRetry={() => {
          void modes.reload()
          void templates.reload()
        }}
      />
    )
  }

  const modeList = modes.data ?? []
  const templateList = templates.data ?? []
  const currentMode = modeList.find((m) => m.id === modeId)

  if (modeList.length === 0) {
    return (
      <>
        <Header />
        <EmptyState
          icon={<Layers />}
          title="Create a profile mode first"
          description="Templates are chosen per mode. Create a mode and its resume will be previewed in every template here."
          action={
            <Button to="/dashboard/modes/new" icon={<Plus />}>
              Create mode
            </Button>
          }
        />
      </>
    )
  }

  async function select(t: TemplateInfo) {
    if (!currentMode) return
    setSelecting(t.id)
    try {
      const updated = await modesApi.assignTemplate(currentMode.id, t.id)
      modes.setData(modeList.map((m) => (m.id === updated.id ? updated : m)))
      setPreview((p) => (p ? { ...p, modes: p.modes.map((m) => ({ ...m, templateKey: t.key })) } : p))
      toast.success(`${t.name} applied to ${currentMode.modeName}.`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSelecting(null)
    }
  }

  const mode = preview?.modes[0]

  return (
    <>
      <Header />
      <GlassCard className={local.modePicker}>
        <SelectField
          label="Choose a template for"
          value={modeId}
          onChange={(e) => setModeId(e.target.value)}
          options={modeList.map((m) => ({ value: m.id, label: `${m.modeName}${m.templateName ? ` — ${m.templateName}` : ''}` }))}
        />
        <p className={styles.muted}>Different modes can use different templates. Previews use this mode’s real content.</p>
      </GlassCard>

      {previewError && <ErrorState message={previewError} />}

      <div className={local.grid}>
        {templateList.map((t) => {
          const selected = currentMode?.templateId === t.id || (!currentMode?.templateId && t.key === 'modern-glass')
          return (
            <GlassCard key={t.id} padded={false} className={[local.card, selected && local.selected].filter(Boolean).join(' ')}>
              <div className={local.thumb}>
                {preview && mode ? (
                  <TemplateThumbnail
                    templateKey={t.key}
                    fullName={preview.fullName}
                    photoUrl={preview.photoUrl}
                    permanentUrl={preview.permanentUrl}
                    mode={{ ...mode, templateKey: t.key }}
                    height={230}
                  />
                ) : (
                  <div className={local.thumbPlaceholder} />
                )}
                {selected && (
                  <span className={local.selectedMark} aria-label="Selected">
                    <Check />
                  </span>
                )}
              </div>
              <div className={local.body}>
                <div className={local.titleRow}>
                  <h3>{t.name}</h3>
                  {t.isPremium && (
                    <Badge tone="gold">
                      <Crown /> Premium
                    </Badge>
                  )}
                </div>
                <p>{t.description}</p>
                <div className={local.actions}>
                  <Button size="sm" variant="ghost" icon={<Eye />} onClick={() => setLivePreview(t)} disabled={!mode}>
                    Live preview
                  </Button>
                  {t.isLocked ? (
                    <Button size="sm" variant="premium" to="/dashboard/subscription" icon={<Lock />}>
                      Upgrade
                    </Button>
                  ) : (
                    <Button size="sm" disabled={selected} loading={selecting === t.id} onClick={() => select(t)} icon={selected ? <Check /> : undefined}>
                      {selected ? 'Selected' : 'Select template'}
                    </Button>
                  )}
                </div>
              </div>
            </GlassCard>
          )
        })}
      </div>

      <Modal open={!!livePreview && !!mode} title={livePreview ? `${livePreview.name} — live preview` : ''} size="xl" onClose={() => setLivePreview(null)}>
        {livePreview && preview && mode && <ProfilePreview profile={preview} mode={mode} templateKey={livePreview.key} />}
      </Modal>
    </>
  )
}

function Header() {
  return (
    <div className={styles.pageHeader}>
      <div>
        <h1>Choose Your Template ✨</h1>
        <p>Ten professional resume designs. Switching templates never changes your QR code.</p>
      </div>
    </div>
  )
}
