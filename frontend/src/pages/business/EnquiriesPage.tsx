import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Inbox, Mail, MessageCircle, Phone, Search, Send } from 'lucide-react'
import { businessEngagementApi } from '../../api/businessApi'
import { getErrorMessage } from '../../api/client'
import { useAsync } from '../../hooks/useAsync'
import { useAutoRefresh } from '../../hooks/useAutoRefresh'
import { ENQUIRY_STATUSES, enquiryStatus, whatsAppUrl } from '../../lib/business'
import { formatDate } from '../../lib/format'
import { mailHref, telHref } from '../../lib/url'
import { Button } from '../../components/ui/Button'
import { Badge, EmptyState, ErrorState, Skeleton, Spinner } from '../../components/ui/Feedback'
import { SelectField, TextArea, TextField } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Surface'
import { FilterTabs, Pagination } from '../../components/ui/Widgets'
import { useToast } from '../../components/ui/Toast'
import { relativeTime } from '../../components/business/insights/insightsUtils'
import type { EnquiryActivity, EnquiryDetail, EnquiryStatus, EnquirySummary } from '../../types/business'
import { RequireBusinessRole, useBusiness } from './BusinessShell'
import shared from '../dashboard/Dashboard.module.scss'
import styles from '../../components/business/insights/Insights.module.scss'

type Tab = 'All' | EnquiryStatus
const PAGE_SIZE = 20

export default function EnquiriesPage() {
  return (
    <RequireBusinessRole minimum="Manager">
      <Enquiries />
    </RequireBusinessRole>
  )
}

function Enquiries() {
  const { business } = useBusiness()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('All')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Debounce typing so we don't query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const list = useAsync(
    () =>
      businessEngagementApi.enquiries(business.id, {
        status: tab === 'All' ? undefined : tab,
        search: search || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    [business.id, tab, search, page],
  )
  // New enquiries appear without a manual reload (uses the current tab, search and page).
  useAutoRefresh(
    () =>
      businessEngagementApi.enquiries(business.id, {
        status: tab === 'All' ? undefined : tab,
        search: search || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    list.setData,
  )

  const openId = params.get('open')
  const setOpen = (id: string | null) => {
    const next = new URLSearchParams(params)
    if (id) next.set('open', id)
    else next.delete('open')
    setParams(next, { replace: true })
  }

  /** Keeps the list row in sync after the detail changes (status / reply). */
  function onUpdated(d: EnquiryDetail) {
    list.setData((prev) =>
      prev ? { ...prev, items: prev.items.map((e) => (e.id === d.id ? { ...e, status: d.status, updatedAt: new Date().toISOString() } : e)) } : prev!,
    )
  }

  return (
    <>
      <div className={shared.pageHeader}>
        <div>
          <h1>Enquiries</h1>
          <p>Messages customers sent from your storefront. Reply, track progress and keep a full history.</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <FilterTabs<Tab>
          label="Filter by status"
          value={tab}
          onChange={(v) => {
            setTab(v)
            setPage(1)
          }}
          options={[{ value: 'All', label: 'All' }, ...ENQUIRY_STATUSES.map((s) => ({ value: s.value, label: s.label }))]}
        />
        <TextField
          aria-label="Search enquiries"
          placeholder="Search name, subject, phone…"
          icon={<Search />}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <div className={styles.enquiryList}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={92} radius={14} />
          ))}
        </div>
      ) : list.data.items.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title={search || tab !== 'All' ? 'No matching enquiries' : 'No enquiries yet'}
          description={
            search || tab !== 'All'
              ? 'Try a different status or search term.'
              : 'When customers send a message from your storefront, it will appear here and you’ll get an email.'
          }
        />
      ) : (
        <>
          <ul className={styles.enquiryList} aria-busy={list.loading}>
            {list.data.items.map((e) => (
              <li key={e.id}>
                <EnquiryRow enquiry={e} onOpen={() => setOpen(e.id)} />
              </li>
            ))}
          </ul>
          <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onChange={setPage} />
        </>
      )}

      {openId && <EnquiryDetailModal businessId={business.id} enquiryId={openId} onClose={() => setOpen(null)} onUpdated={onUpdated} />}
    </>
  )
}

function EnquiryRow({ enquiry: e, onOpen }: { enquiry: EnquirySummary; onOpen: () => void }) {
  const s = enquiryStatus(e.status)
  return (
    <button type="button" className={[styles.enquiryItem, e.status === 'New' && styles.enquiryNew].filter(Boolean).join(' ')} onClick={onOpen}>
      <div className={styles.enquiryHead}>
        <strong>{e.customerName}</strong>
        <span>{e.subject}</span>
      </div>
      <div className={styles.enquiryMeta}>
        <Badge tone={s.tone}>{s.label}</Badge>
        <time dateTime={e.createdAt}>{relativeTime(e.createdAt)}</time>
      </div>
      <p className={styles.enquiryPreview}>{e.messagePreview}</p>
      {e.relatedItemName && <span className={styles.related}>About: {e.relatedItemName}</span>}
    </button>
  )
}

const activityTitle = (a: EnquiryActivity) => {
  switch (a.type) {
    case 'Created':
      return 'Enquiry received'
    case 'Response':
      return `Reply sent${a.byName ? ` by ${a.byName}` : ''}`
    case 'StatusChanged':
      return `Marked ${a.status ? enquiryStatus(a.status).label.toLowerCase() : 'updated'}${a.byName ? ` by ${a.byName}` : ''}`
    default:
      return `Note${a.byName ? ` from ${a.byName}` : ''}`
  }
}

function EnquiryDetailModal({
  businessId,
  enquiryId,
  onClose,
  onUpdated,
}: {
  businessId: string
  enquiryId: string
  onClose: () => void
  onUpdated: (d: EnquiryDetail) => void
}) {
  const toast = useToast()
  const detail = useAsync(() => businessEngagementApi.enquiry(businessId, enquiryId), [businessId, enquiryId])
  const [status, setStatus] = useState<EnquiryStatus | ''>('')
  const [note, setNote] = useState('')
  const [reply, setReply] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [busy, setBusy] = useState<'status' | 'reply' | null>(null)
  const [replyError, setReplyError] = useState<string | null>(null)

  const d = detail.data
  useEffect(() => {
    if (d) {
      setStatus(d.status)
      if (!d.email) setSendEmail(false)
    }
  }, [d])

  function apply(updated: EnquiryDetail) {
    detail.setData(updated)
    onUpdated(updated)
  }

  async function saveStatus(e: FormEvent) {
    e.preventDefault()
    if (!d || !status) return
    setBusy('status')
    try {
      apply(await businessEngagementApi.setEnquiryStatus(businessId, d.id, status, note.trim() || null))
      setNote('')
      toast.success('Enquiry updated.')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function sendReply(e: FormEvent) {
    e.preventDefault()
    if (!d) return
    if (reply.trim().length < 2) {
      setReplyError('Write a reply first.')
      return
    }
    setReplyError(null)
    setBusy('reply')
    try {
      apply(await businessEngagementApi.respond(businessId, d.id, reply.trim(), sendEmail))
      setReply('')
      toast.success(sendEmail ? 'Reply emailed to the customer.' : 'Reply recorded.')
    } catch (err) {
      setReplyError(getErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal open title={d ? d.subject : 'Enquiry'} size="lg" onClose={onClose}>
      {detail.error ? (
        <ErrorState message={detail.error} onRetry={detail.reload} />
      ) : !d ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}>
          <Spinner />
        </div>
      ) : (
        <div className={styles.detail}>
          <div className={styles.detailMeta}>
            <Badge tone={enquiryStatus(d.status).tone}>{enquiryStatus(d.status).label}</Badge>
            <span>
              From <strong>{d.customerName}</strong> · {formatDate(d.createdAt)}
            </span>
            {d.relatedItemName && <span className={styles.related}>About: {d.relatedItemName}</span>}
          </div>

          <p className={styles.message}>{d.message}</p>

          <div className={styles.contactActions}>
            {d.phone && (
              <Button href={telHref(d.phone)} size="sm" variant="secondary" icon={<Phone />}>
                Call {d.phone}
              </Button>
            )}
            {d.phone && (
              <Button href={whatsAppUrl(d.phone, `Hi ${d.customerName}, regarding your enquiry "${d.subject}"`)} target="_blank" size="sm" variant="secondary" icon={<MessageCircle />}>
                WhatsApp
              </Button>
            )}
            {d.email && (
              <Button href={mailHref(d.email)} size="sm" variant="secondary" icon={<Mail />}>
                {d.email}
              </Button>
            )}
          </div>

          <form className={styles.section} onSubmit={sendReply}>
            <h3>Reply to {d.customerName}</h3>
            <TextArea
              aria-label="Reply message"
              rows={4}
              maxLength={3000}
              placeholder="Write your reply…"
              value={reply}
              error={replyError ?? undefined}
              onChange={(e) => setReply(e.target.value)}
            />
            <div className={styles.replyActions}>
              <label className={[styles.checkbox, !d.email && styles.checkboxDisabled].filter(Boolean).join(' ')}>
                <input type="checkbox" checked={sendEmail} disabled={!d.email} onChange={(e) => setSendEmail(e.target.checked)} />
                {d.email ? 'Email this reply to the customer' : 'No email on file — record the reply only'}
              </label>
              <Button type="submit" icon={<Send />} loading={busy === 'reply'} disabled={busy !== null}>
                {sendEmail ? 'Send reply' : 'Record reply'}
              </Button>
            </div>
          </form>

          <form className={styles.section} onSubmit={saveStatus}>
            <h3>Status</h3>
            <div className={styles.inlineForm}>
              <SelectField
                aria-label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as EnquiryStatus)}
                options={ENQUIRY_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              />
              <TextField aria-label="Internal note (optional)" placeholder="Internal note (optional)" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
              <Button type="submit" variant="outline" loading={busy === 'status'} disabled={busy !== null || (status === d.status && !note.trim())}>
                Update
              </Button>
            </div>
          </form>

          <div className={styles.section}>
            <h3>History</h3>
            <ol className={styles.history}>
              {d.activities.map((a) => (
                <li key={a.id} className={[styles.historyItem, a.type === 'Response' && styles.historyResponse].filter(Boolean).join(' ')}>
                  <strong>{activityTitle(a)}</strong>
                  <time dateTime={a.createdAt}>
                    {formatDate(a.createdAt)} · {relativeTime(a.createdAt)}
                  </time>
                  {a.message && <p>{a.message}</p>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Modal>
  )
}
