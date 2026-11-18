import { useState } from 'react'
import { Check, Crown, Receipt, ShieldCheck } from 'lucide-react'
import { subscriptionApi } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { config } from '../../config'
import { useAsync } from '../../hooks/useAsync'
import { formatDate, formatMoney } from '../../lib/format'
import { openRazorpayCheckout } from '../../lib/razorpay'
import { Button } from '../../components/ui/Button'
import { Alert, Badge, EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback'
import { CardHeader, GlassCard } from '../../components/ui/Surface'
import { useToast } from '../../components/ui/Toast'
import type { PaymentStatus, Plan } from '../../types/api'
import styles from './Dashboard.module.scss'
import local from './SubscriptionPage.module.scss'

const statusTone: Record<PaymentStatus, 'green' | 'amber' | 'red'> = { Captured: 'green', Created: 'amber', Failed: 'red' }
const statusLabel: Record<PaymentStatus, string> = { Captured: 'Paid', Created: 'Pending', Failed: 'Failed' }

export default function SubscriptionPage() {
  const toast = useToast()
  const status = useAsync(() => subscriptionApi.status())
  const plans = useAsync(() => subscriptionApi.plans())
  const payments = useAsync(() => subscriptionApi.payments())
  const [processing, setProcessing] = useState<number | null>(null)
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null)

  if ((status.loading && !status.data) || (plans.loading && !plans.data)) return <PageLoader label="Loading subscription…" />
  if (status.error || plans.error || !status.data) {
    return <ErrorState message={status.error ?? plans.error ?? 'Unknown error'} onRetry={() => { void status.reload(); void plans.reload() }} />
  }

  const s = status.data
  const e = s.entitlements

  async function buy(plan: Plan) {
    setProcessing(plan.id)
    setMessage(null)
    try {
      const order = await subscriptionApi.createOrder(plan.id)
      const gatewayResponse = await openRazorpayCheckout(order, config.appName)
      setMessage({ tone: 'info', text: 'Verifying your payment securely…' })
      // The subscription is only activated after the backend verifies the Razorpay signature.
      const verified = await subscriptionApi.verify(gatewayResponse)
      status.setData(verified)
      setMessage({ tone: 'success', text: `Payment verified. ${plan.name} is active until ${formatDate(verified.expiresAt)}.` })
      toast.success('Subscription activated!')
    } catch (err) {
      const text = getErrorMessage(err)
      setMessage({ tone: text === 'Payment cancelled.' ? 'info' : 'error', text })
    } finally {
      setProcessing(null)
      void payments.reload()
    }
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1>Subscription</h1>
          <p>Upgrade for more profile modes and all 10 premium templates. Payments are processed securely by Razorpay.</p>
        </div>
      </div>

      <div className={styles.stack}>
        {e.allFeaturesUnlocked && (
          <Alert tone="success">
            Good news — every template and feature is free for everyone right now, so there’s nothing to buy. Your profile modes
            and premium templates are already unlocked.
          </Alert>
        )}
        {message && <Alert tone={message.tone}>{message.text}</Alert>}

        <GlassCard className={local.current}>
          <div className={local.currentIcon}>
            <Crown />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <span className={styles.muted}>Current plan</span>
            <h2>{e.planName}</h2>
            <p className={styles.muted}>
              Up to {e.maxModes} profile modes · {e.allowsPremiumTemplates ? 'All 10 templates' : 'Essential templates'}
            </p>
          </div>
          <div className={local.currentMeta}>
            {e.isPaid ? (
              <>
                <Badge tone="green">
                  <ShieldCheck /> Active
                </Badge>
                <span>
                  Renews / expires <strong>{formatDate(s.expiresAt)}</strong>
                  {s.daysRemaining !== null && ` · ${s.daysRemaining} days left`}
                </span>
              </>
            ) : (
              <Badge tone="gray">Free forever</Badge>
            )}
          </div>
        </GlassCard>

        <div className={local.plans}>
          {(plans.data ?? []).map((p) => {
            const isCurrent = p.code === e.planCode
            const isFree = p.priceInPaise === 0
            return (
              <GlassCard key={p.id} className={[local.plan, p.code === 'pro-yearly' && local.featured].filter(Boolean).join(' ')}>
                {p.code === 'pro-yearly' && <span className={local.ribbon}>Best value</span>}
                <h3>{p.name}</h3>
                <p className={styles.muted}>{p.description}</p>
                <div className={local.price}>
                  <strong>{isFree ? 'Free' : formatMoney(p.priceInPaise, p.currency)}</strong>
                  {!isFree && <span>/ {p.durationDays >= 365 ? 'year' : `${p.durationDays} days`}</span>}
                </div>
                <ul>
                  <li>
                    <Check /> Up to {p.maxModes} profile modes
                  </li>
                  <li>
                    <Check /> {p.allowsPremiumTemplates ? 'All 10 premium templates' : '4 essential templates'}
                  </li>
                  <li>
                    <Check /> Permanent QR code & public URL
                  </li>
                  <li>
                    <Check /> vCard save & home-screen install
                  </li>
                </ul>
                {e.allFeaturesUnlocked && !isFree ? (
                  <Button variant="secondary" disabled fullWidth>
                    Included free right now
                  </Button>
                ) : isFree ? (
                  <Button variant="secondary" disabled fullWidth>
                    {isCurrent ? 'Current plan' : 'Included'}
                  </Button>
                ) : (
                  <Button variant={p.code === 'pro-yearly' ? 'premium' : 'primary'} fullWidth loading={processing === p.id} disabled={processing !== null} onClick={() => buy(p)}>
                    {e.isPaid ? 'Extend with this plan' : `Upgrade to ${p.name}`}
                  </Button>
                )}
              </GlassCard>
            )
          })}
        </div>

        <GlassCard>
          <CardHeader title="Payment history" subtitle="Payments are activated only after server-side verification." />
          {payments.error ? (
            <ErrorState message={payments.error} onRetry={payments.reload} />
          ) : !payments.data?.length ? (
            <EmptyState icon={<Receipt />} title="No payments yet" description="Your invoices and payment attempts will appear here." />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Payment ID</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.data.map((p) => (
                    <tr key={p.id}>
                      <td>{formatDate(p.paidAt ?? p.createdAt)}</td>
                      <td>{p.planName}</td>
                      <td>{formatMoney(p.amountInPaise, p.currency)}</td>
                      <td>
                        <Badge tone={statusTone[p.status]}>{statusLabel[p.status]}</Badge>
                      </td>
                      <td className={styles.mono}>{p.razorpayPaymentId ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </>
  )
}
