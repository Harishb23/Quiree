import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Layers, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { modesApi, subscriptionApi } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { useAsync } from '../../hooks/useAsync'
import { modeTypes } from '../../lib/modeTypes'
import { Button } from '../../components/ui/Button'
import { Alert, Badge, EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback'
import { GlassCard, Modal, Toggle } from '../../components/ui/Surface'
import { useToast } from '../../components/ui/Toast'
import { ModePreviewModal } from './ModePreviewModal'
import type { ModeSummary } from '../../types/api'
import styles from './Dashboard.module.scss'
import local from './ModesPage.module.scss'

export default function ModesPage() {
  const toast = useToast()
  const modes = useAsync(() => modesApi.list())
  const status = useAsync(() => subscriptionApi.status())
  const [busy, setBusy] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<ModeSummary | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)

  if (modes.loading && !modes.data) return <PageLoader label="Loading profile modes…" />
  if (modes.error || !modes.data) return <ErrorState message={modes.error ?? 'Unknown error'} onRetry={modes.reload} />

  const list = modes.data
  const maxModes = status.data?.entitlements.maxModes
  const atLimit = maxModes !== undefined && list.length >= maxModes

  async function run(id: string, action: () => Promise<void>) {
    setBusy(id)
    try {
      await action()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const togglePublished = (m: ModeSummary, value: boolean) =>
    run(m.id, async () => {
      const updated = await modesApi.setPublished(m.id, value)
      modes.setData(list.map((x) => (x.id === updated.id ? updated : x)))
      toast.success(value ? `${m.modeName} is now visible to viewers.` : `${m.modeName} is hidden from viewers.`)
    })

  const makeDefault = (m: ModeSummary) =>
    run(m.id, async () => {
      modes.setData(await modesApi.setDefault(m.id))
      toast.success(`${m.modeName} is now your default mode. Your QR code stays the same.`)
    })

  const confirmDelete = () =>
    toDelete &&
    run(toDelete.id, async () => {
      await modesApi.remove(toDelete.id)
      setToDelete(null)
      toast.success('Mode deleted.')
      await modes.reload()
    })

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1>Profile Modes</h1>
          <p>Each mode is an independent professional identity — all shared through your one permanent QR code.</p>
        </div>
        {atLimit ? (
          <Button to="/dashboard/subscription" variant="premium">
            Upgrade to add modes
          </Button>
        ) : (
          <Button to="/dashboard/modes/new" icon={<Plus />}>
            Create mode
          </Button>
        )}
      </div>

      {atLimit && (
        <div style={{ marginBottom: 20 }}>
          <Alert tone="info">
            You’ve used all {maxModes} modes on the {status.data?.entitlements.planName} plan.{' '}
            <Link to="/dashboard/subscription" style={{ textDecoration: 'underline' }}>
              Upgrade
            </Link>{' '}
            to add more.
          </Alert>
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={<Layers />}
          title="Create your first professional identity"
          description="For example: Software Developer, HR Manager, Entrepreneur or Digital Marketer. Each mode gets its own resume and template."
          action={
            <Button to="/dashboard/modes/new" icon={<Plus />}>
              Create mode
            </Button>
          }
        />
      ) : (
        <div className={local.grid}>
          {list.map((m) => {
            const meta = modeTypes[m.modeType] ?? modeTypes.General
            const Icon = meta.icon
            return (
              <GlassCard key={m.id} className={local.card}>
                <div className={local.top}>
                  <span className={styles.modeIcon}>
                    <Icon />
                  </span>
                  <div className={local.title}>
                    <h3>{m.modeName}</h3>
                    <span>{m.designation || meta.label}</span>
                  </div>
                  <Toggle
                    checked={m.isPublished}
                    disabled={busy === m.id}
                    label={`Publish ${m.modeName}`}
                    onChange={(v) => togglePublished(m, v)}
                  />
                </div>
                <div className={local.badges}>
                  {m.isDefault && (
                    <Badge tone="violet">
                      <Star /> Default
                    </Badge>
                  )}
                  <Badge tone={m.isPublished ? 'green' : 'gray'}>{m.isPublished ? 'Published' : 'Hidden'}</Badge>
                  {m.templateName && <Badge tone="gray">{m.templateName}</Badge>}
                </div>
                <div className={local.actions}>
                  <Button to={`/dashboard/modes/${m.id}`} size="sm" variant="secondary" icon={<Pencil />}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Eye />} onClick={() => setPreviewId(m.id)}>
                    Preview
                  </Button>
                  {!m.isDefault && (
                    <Button size="sm" variant="ghost" icon={<Star />} disabled={busy === m.id} onClick={() => makeDefault(m)}>
                      Set default
                    </Button>
                  )}
                  <button
                    type="button"
                    className={[styles.iconBtn, styles.iconBtnDanger].join(' ')}
                    aria-label={`Delete ${m.modeName}`}
                    onClick={() => setToDelete(m)}
                    style={{ marginLeft: 'auto' }}
                  >
                    <Trash2 />
                  </button>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      <Modal
        open={!!toDelete}
        title="Delete profile mode?"
        size="sm"
        onClose={() => setToDelete(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" icon={<Trash2 />} loading={busy === toDelete?.id} onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p>
          <strong>{toDelete?.modeName}</strong> and all of its resume content will be permanently removed. Viewers who
          saved this mode will see your default mode instead. Your QR code is not affected.
        </p>
      </Modal>

      {previewId && <ModePreviewModal modeId={previewId} onClose={() => setPreviewId(null)} />}
    </>
  )
}
