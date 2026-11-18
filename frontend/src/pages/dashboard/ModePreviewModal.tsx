import { useState } from 'react'
import { modesApi } from '../../api/endpoints'
import { Button } from '../../components/ui/Button'
import { ProfileCard } from '../../cards/ProfileCard'
import { useAsync } from '../../hooks/useAsync'
import { ErrorState, PageLoader } from '../../components/ui/Feedback'
import { Modal } from '../../components/ui/Surface'
import { TemplateRenderer } from '../../templates'
import type { PublicMode, PublicProfile } from '../../types/api'
import styles from './Dashboard.module.scss'

/** Owner-only preview of a saved mode, rendered exactly as viewers will see it. */
export function ModePreviewModal({ modeId, onClose }: { modeId: string; onClose: () => void }) {
  const preview = useAsync(() => modesApi.preview(modeId), [modeId])
  return (
    <Modal open title="Preview" size="xl" onClose={onClose}>
      {preview.loading ? (
        <PageLoader label="Rendering preview…" />
      ) : preview.error || !preview.data ? (
        <ErrorState message={preview.error ?? 'Preview unavailable'} onRetry={preview.reload} />
      ) : (
        <ProfilePreview profile={preview.data} mode={preview.data.modes[0]!} />
      )}
    </Modal>
  )
}

export function ProfilePreview({
  profile,
  mode,
  templateKey,
}: {
  profile: Pick<PublicProfile, 'fullName' | 'photoUrl' | 'permanentUrl'>
  mode: PublicMode
  templateKey?: string
}) {
  const [view, setView] = useState<'card' | 'resume'>('card')
  const key = templateKey ?? mode.templateKey
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <Button size="sm" variant={view === 'card' ? 'primary' : 'secondary'} onClick={() => setView('card')}>
          Scan view (card)
        </Button>
        <Button size="sm" variant={view === 'resume' ? 'primary' : 'secondary'} onClick={() => setView('resume')}>
          Full resume
        </Button>
      </div>
      {view === 'card' ? (
        <div className={styles.cardStage}>
          <ProfileCard
            fullName={profile.fullName}
            photoUrl={profile.photoUrl}
            permanentUrl={profile.permanentUrl}
            mode={mode}
            templateKey={key}
          />
        </div>
      ) : (
        <div className={styles.previewFrame}>
          <TemplateRenderer
            templateKey={key}
            fullName={profile.fullName}
            photoUrl={profile.photoUrl}
            permanentUrl={profile.permanentUrl}
            mode={mode}
          />
        </div>
      )}
    </div>
  )
}
