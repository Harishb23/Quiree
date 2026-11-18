import { useState } from 'react'
import { Check, EyeOff, MessageSquareReply, Star, Trash2 } from 'lucide-react'
import { businessEngagementApi } from '../../api/businessApi'
import { getErrorMessage } from '../../api/client'
import { useAsync } from '../../hooks/useAsync'
import { useAutoRefresh } from '../../hooks/useAutoRefresh'
import { formatDate } from '../../lib/format'
import { Button } from '../../components/ui/Button'
import { Badge, EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback'
import { TextArea } from '../../components/ui/Field'
import { GlassCard } from '../../components/ui/Surface'
import { ConfirmDialog, FilterTabs } from '../../components/ui/Widgets'
import { useToast } from '../../components/ui/Toast'
import type { Review, ReviewStatus } from '../../types/business'
import { Stars } from '../../components/business/insights/Stars'
import { summarize } from '../../components/business/insights/insightsUtils'
import { useBusiness } from './BusinessShell'
import shared from '../dashboard/Dashboard.module.scss'
import styles from '../../components/business/insights/Insights.module.scss'

type Tab = 'All' | ReviewStatus

const STATUS_TONE: Record<ReviewStatus, 'amber' | 'green' | 'gray'> = { Pending: 'amber', Approved: 'green', Hidden: 'gray' }

export default function ReviewsPage() {
  const { business, can } = useBusiness()
  const toast = useToast()
  const reviews = useAsync(() => businessEngagementApi.reviews(business.id), [business.id])
  // New customer reviews appear without a manual reload.
  useAutoRefresh(() => businessEngagementApi.reviews(business.id), reviews.setData)
  const [tab, setTab] = useState<Tab>('Pending')
  const [busy, setBusy] = useState<string | null>(null)
  const [replying, setReplying] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [toDelete, setToDelete] = useState<Review | null>(null)
  const canModerate = can('Manager')

  if (reviews.loading && !reviews.data) return <PageLoader label="Loading reviews…" />
  if (reviews.error || !reviews.data) return <ErrorState message={reviews.error ?? 'Unknown error'} onRetry={reviews.reload} />

  const all = reviews.data
  const summary = summarize(all)
  const shown = tab === 'All' ? all : all.filter((r) => r.status === tab)
  const count = (s: ReviewStatus) => all.filter((r) => r.status === s).length

  function replace(updated: Review) {
    reviews.setData((prev) => (prev ?? []).map((r) => (r.id === updated.id ? updated : r)))
  }

  async function update(review: Review, status: ReviewStatus, ownerReply: string | null, message: string) {
    setBusy(review.id)
    try {
      replace(await businessEngagementApi.updateReview(business.id, review.id, status, ownerReply))
      toast.success(message)
      return true
    } catch (e) {
      toast.error(getErrorMessage(e))
      return false
    } finally {
      setBusy(null)
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    setBusy(toDelete.id)
    try {
      await businessEngagementApi.deleteReview(business.id, toDelete.id)
      reviews.setData((prev) => (prev ?? []).filter((r) => r.id !== toDelete.id))
      toast.success('Review deleted.')
      setToDelete(null)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className={shared.pageHeader}>
        <div>
          <h1>Reviews</h1>
          <p>
            New reviews wait for approval before they appear on your storefront.
            {!canModerate && ' Only the owner or a manager can approve or reply.'}
          </p>
        </div>
      </div>

      <GlassCard>
        <div className={styles.ratingSummary}>
          <div className={styles.ratingBig}>
            <strong>{summary.count ? summary.average.toFixed(1) : '–'}</strong>
            <Stars rating={Math.round(summary.average)} />
            <span>
              {summary.count} approved review{summary.count === 1 ? '' : 's'}
            </span>
          </div>
          <ul className={styles.distribution} aria-label="Rating distribution">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = summary.distribution[star - 1]!
              return (
                <li key={star}>
                  <span>{star} ★</span>
                  <span className={styles.distTrack}>
                    <span style={{ width: summary.count ? `${(n / summary.count) * 100}%` : 0 }} />
                  </span>
                  <span>{n}</span>
                </li>
              )
            })}
          </ul>
        </div>
      </GlassCard>

      <div style={{ marginTop: 20 }}>
        <FilterTabs<Tab>
          label="Filter reviews"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'Pending', label: 'Pending', count: count('Pending') },
            { value: 'Approved', label: 'Approved', count: count('Approved') },
            { value: 'Hidden', label: 'Hidden', count: count('Hidden') },
            { value: 'All', label: 'All', count: all.length },
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <div style={{ marginTop: 20 }}>
          <EmptyState
            icon={<Star />}
            title={all.length === 0 ? 'No reviews yet' : `No ${tab.toLowerCase()} reviews`}
            description={all.length === 0 ? 'Customers can leave a rating and review from your storefront.' : undefined}
          />
        </div>
      ) : (
        <ul className={styles.reviewList}>
          {shown.map((r) => (
            <li key={r.id} className={styles.reviewCard}>
              <div className={styles.reviewHead}>
                <div>
                  <strong>{r.customerName}</strong>
                  <Stars rating={r.rating} />
                  <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                </div>
                <time dateTime={r.createdAt}>{formatDate(r.createdAt)}</time>
              </div>
              {r.comment && <p className={styles.reviewComment}>{r.comment}</p>}
              {r.ownerReply && replying !== r.id && (
                <div className={styles.ownerReply}>
                  <strong>Your reply</strong>
                  {r.ownerReply}
                </div>
              )}

              {replying === r.id && (
                <form
                  className={styles.section}
                  onSubmit={async (e) => {
                    e.preventDefault()
                    if (await update(r, r.status, replyText.trim() || null, 'Reply saved.')) setReplying(null)
                  }}
                >
                  <TextArea aria-label="Reply to this review" rows={3} maxLength={1000} value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                  <div className={styles.reviewActions}>
                    <Button type="submit" size="sm" loading={busy === r.id}>
                      Save reply
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setReplying(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {canModerate && replying !== r.id && (
                <div className={styles.reviewActions}>
                  {r.status !== 'Approved' && (
                    <Button size="sm" icon={<Check />} loading={busy === r.id} onClick={() => update(r, 'Approved', r.ownerReply, 'Review approved — it’s now on your storefront.')}>
                      Approve
                    </Button>
                  )}
                  {r.status !== 'Hidden' && (
                    <Button size="sm" variant="secondary" icon={<EyeOff />} disabled={busy === r.id} onClick={() => update(r, 'Hidden', r.ownerReply, 'Review hidden.')}>
                      Hide
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<MessageSquareReply />}
                    onClick={() => {
                      setReplying(r.id)
                      setReplyText(r.ownerReply ?? '')
                    }}
                  >
                    {r.ownerReply ? 'Edit reply' : 'Reply'}
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Trash2 />} onClick={() => setToDelete(r)}>
                    Delete
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this review?"
        confirmLabel="Delete review"
        busy={busy === toDelete?.id}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      >
        <p>
          The review from <strong>{toDelete?.customerName}</strong> will be permanently removed. To keep it but stop showing it, hide it instead.
        </p>
      </ConfirmDialog>
    </>
  )
}
