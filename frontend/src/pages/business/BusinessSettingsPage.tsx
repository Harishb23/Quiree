import { config } from '../../config'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, EyeOff, Link2, LogOut, Rocket, Trash2, UserPlus } from 'lucide-react'
import { businessApi } from '../../api/businessApi'
import { getErrorMessage } from '../../api/client'
import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../context/AuthContext'
import { copyToClipboard } from '../../lib/share'
import { ROLE_LABELS } from '../../lib/business'
import { Button } from '../../components/ui/Button'
import { Alert, Badge, ErrorState, Spinner } from '../../components/ui/Feedback'
import { SelectField, TextField } from '../../components/ui/Field'
import { CardHeader, GlassCard } from '../../components/ui/Surface'
import { ConfirmDialog } from '../../components/ui/Widgets'
import { useToast } from '../../components/ui/Toast'
import type { BusinessMember, BusinessRole } from '../../types/business'
import { useBusiness } from './BusinessShell'
import { validateSlug } from '../../components/business/profile/businessForm'
import shared from '../dashboard/Dashboard.module.scss'
import styles from '../../components/business/profile/Profile.module.scss'

const ASSIGNABLE: BusinessRole[] = ['Manager', 'Editor']

export default function BusinessSettingsPage() {
  const { business, can } = useBusiness()
  return (
    <>
      <div className={shared.pageHeader}>
        <div>
          <h1>Business settings</h1>
          <p>Visibility, your public link, team access and account options for {business.name}.</p>
        </div>
      </div>
      <div className={shared.stack}>
        <VisibilityCard />
        <LinkCard />
        <TeamCard />
        {can('Owner') && <DangerZone />}
      </div>
    </>
  )
}

function VisibilityCard() {
  const { business, can, setBusiness } = useBusiness()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const published = business.status === 'Published'

  async function toggle() {
    setBusy(true)
    setError(null)
    try {
      const updated = published ? await businessApi.unpublish(business.id) : await businessApi.publish(business.id)
      setBusiness(updated)
      toast.success(published ? 'Your storefront is now hidden.' : 'Your storefront is live!')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <GlassCard>
      <CardHeader title="Visibility" subtitle="Draft profiles are only visible to your team. Published profiles open for anyone with the link or QR code." />
      <div className={styles.statusRow}>
        <Badge tone={published ? 'green' : 'gray'}>{published ? 'Published · visible to customers' : 'Draft · hidden from customers'}</Badge>
        {can('Manager') ? (
          <Button variant={published ? 'outline' : 'premium'} icon={published ? <EyeOff /> : <Rocket />} loading={busy} onClick={toggle}>
            {published ? 'Unpublish' : 'Publish profile'}
          </Button>
        ) : (
          <span className={shared.muted}>Only owners and managers can change visibility.</span>
        )}
      </div>
      {error && (
        <div style={{ marginTop: 14 }}>
          <Alert tone="error">{error}</Alert>
        </div>
      )}
    </GlassCard>
  )
}

function LinkCard() {
  const { business, can, setBusiness } = useBusiness()
  const toast = useToast()
  const [slug, setSlug] = useState(business.slug)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const base = business.publicUrl.slice(0, business.publicUrl.length - business.slug.length)

  async function save(e: FormEvent) {
    e.preventDefault()
    const value = slug.trim().toLowerCase()
    const invalid = validateSlug(value)
    if (invalid) {
      setError(invalid)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const updated = await businessApi.updateSlug(business.id, value)
      setBusiness(updated)
      setSlug(updated.slug)
      toast.success('Public link updated.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <GlassCard>
      <CardHeader title="Public link" subtitle="The web address of your storefront." />
      <div className={styles.stack}>
        <div className={styles.linkPreview}>
          <Link2 size={16} aria-hidden />
          <span style={{ flex: 1 }}>{business.publicUrl}</span>
          <button
            type="button"
            className={shared.iconBtn}
            aria-label="Copy public link"
            onClick={async () => (await copyToClipboard(business.publicUrl)) && toast.success('Link copied.')}
          >
            <Copy />
          </button>
        </div>
        {can('Owner') && (
          <form className={styles.slugForm} onSubmit={save} noValidate>
            <TextField
              label="Custom link"
              value={slug}
              maxLength={60}
              error={error ?? undefined}
              hint={`${base}${slug || '…'} · Your QR code keeps working if you change this — it doesn’t contain the link.`}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            />
            <Button type="submit" variant="secondary" loading={saving} disabled={slug === business.slug}>
              Save link
            </Button>
          </form>
        )}
      </div>
    </GlassCard>
  )
}

function TeamCard() {
  const { business, can } = useBusiness()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const members = useAsync(() => businessApi.members(business.id), [business.id])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<BusinessRole>('Editor')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<BusinessMember | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const isOwner = can('Owner')

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter the email address of their account.')
      return
    }
    setAdding(true)
    setError(null)
    try {
      const member = await businessApi.addMember(business.id, email.trim(), role)
      members.setData((list) => [...(list ?? []), member])
      setEmail('')
      toast.success(`${member.fullName} added as ${ROLE_LABELS[member.role].label}.`)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setAdding(false)
    }
  }

  async function changeRole(member: BusinessMember, next: BusinessRole) {
    setBusyId(member.userId)
    try {
      const updated = await businessApi.updateMember(business.id, member.userId, next)
      members.setData((list) => (list ?? []).map((m) => (m.userId === updated.userId ? updated : m)))
      toast.success(`${updated.fullName} is now ${ROLE_LABELS[updated.role].label}.`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  async function confirmRemove() {
    if (!removing) return
    const leaving = removing.userId === user?.id
    setBusyId(removing.userId)
    try {
      await businessApi.removeMember(business.id, removing.userId)
      if (leaving) {
        toast.success(`You left ${business.name}.`)
        navigate('/dashboard/business', { replace: true })
        return
      }
      members.setData((list) => (list ?? []).filter((m) => m.userId !== removing.userId))
      toast.success(`${removing.fullName} removed from the team.`)
      setRemoving(null)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <GlassCard>
      <CardHeader title="Team" subtitle="People who can help manage this business. They sign in with their own account." />
      {members.loading && !members.data ? (
        <Spinner />
      ) : members.error ? (
        <ErrorState message={members.error} onRetry={members.reload} />
      ) : (
        <ul className={styles.memberList}>
          {(members.data ?? []).map((m) => {
            const isSelf = m.userId === user?.id
            return (
              <li key={m.userId} className={styles.memberRow}>
                <div className={styles.memberInfo}>
                  <strong>
                    {m.fullName}
                    {isSelf && <Badge tone="gray">You</Badge>}
                  </strong>
                  <span>{m.email}</span>
                </div>
                <div className={styles.memberControls}>
                  {isOwner && !m.isOwner ? (
                    <select
                      aria-label={`Role for ${m.fullName}`}
                      value={m.role}
                      disabled={busyId === m.userId}
                      onChange={(e) => changeRole(m, e.target.value as BusinessRole)}
                    >
                      {ASSIGNABLE.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r].label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge tone={m.isOwner ? 'gold' : 'violet'}>{ROLE_LABELS[m.role].label}</Badge>
                  )}
                  {!m.isOwner && (isOwner || isSelf) && (
                    <button
                      type="button"
                      className={[shared.iconBtn, shared.iconBtnDanger].join(' ')}
                      aria-label={isSelf ? 'Leave this business' : `Remove ${m.fullName}`}
                      onClick={() => setRemoving(m)}
                    >
                      {isSelf ? <LogOut /> : <Trash2 />}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {isOwner && (
        <form className={styles.addMember} onSubmit={add} noValidate>
          <TextField
            label="Add a team member"
            type="email"
            placeholder="colleague@example.com"
            value={email}
            error={error ?? undefined}
            hint={`They need a ${config.appName} business account with this email.`}
            onChange={(e) => setEmail(e.target.value)}
          />
          <SelectField
            label="Role"
            value={role}
            hint={ROLE_LABELS[role].description}
            onChange={(e) => setRole(e.target.value as BusinessRole)}
            options={ASSIGNABLE.map((r) => ({ value: r, label: ROLE_LABELS[r].label }))}
          />
          <Button type="submit" icon={<UserPlus />} loading={adding}>
            Add
          </Button>
        </form>
      )}

      <ConfirmDialog
        open={!!removing}
        title={removing?.userId === user?.id ? 'Leave this business?' : 'Remove team member?'}
        confirmLabel={removing?.userId === user?.id ? 'Leave' : 'Remove'}
        busy={busyId === removing?.userId}
        onConfirm={confirmRemove}
        onClose={() => setRemoving(null)}
      >
        {removing?.userId === user?.id ? (
          <p>You’ll lose access to {business.name} until the owner adds you again.</p>
        ) : (
          <p>
            <strong>{removing?.fullName}</strong> will no longer be able to manage {business.name}.
          </p>
        )}
      </ConfirmDialog>
    </GlassCard>
  )
}

function DangerZone() {
  const { business } = useBusiness()
  const navigate = useNavigate()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    if (typed.trim() !== business.name) {
      setError('Type the business name exactly to confirm.')
      return
    }
    setBusy(true)
    try {
      await businessApi.remove(business.id)
      toast.success(`${business.name} was deleted.`)
      navigate('/dashboard/business', { replace: true })
    } catch (e) {
      setError(getErrorMessage(e))
      setBusy(false)
    }
  }

  return (
    <GlassCard className={styles.danger}>
      <CardHeader title="Delete business" />
      <div className={styles.dangerRow}>
        <p>
          Permanently deletes this business profile, its products, services, offers, gallery, enquiries, reviews and analytics. The QR code stops
          working. This can’t be undone.
        </p>
        <Button variant="danger" icon={<Trash2 />} onClick={() => setOpen(true)}>
          Delete business
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        title="Delete this business?"
        confirmLabel="Delete permanently"
        busy={busy}
        onConfirm={remove}
        onClose={() => {
          setOpen(false)
          setTyped('')
          setError(null)
        }}
      >
        <p>
          This permanently removes <strong>{business.name}</strong> and everything in it.
        </p>
        <TextField
          label={`Type “${business.name}” to confirm`}
          value={typed}
          error={error ?? undefined}
          autoComplete="off"
          onChange={(e) => {
            setTyped(e.target.value)
            setError(null)
          }}
        />
      </ConfirmDialog>
    </GlassCard>
  )
}
