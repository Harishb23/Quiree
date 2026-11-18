import { loadScript } from './loadScript'
import type { CreateOrderResponse, VerifyPaymentRequest } from '../types/api'

interface RazorpaySuccess {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface RazorpayInstance {
  open: () => void
  on: (event: 'payment.failed', handler: (response: { error?: { description?: string } }) => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance
  }
}

/**
 * Opens Razorpay Checkout for a server-created order. Resolves with the gateway response, which the
 * caller MUST send to the backend for signature verification — success here is never trusted on its own.
 */
export async function openRazorpayCheckout(order: CreateOrderResponse, appName: string): Promise<VerifyPaymentRequest> {
  await loadScript('https://checkout.razorpay.com/v1/checkout.js')
  if (!window.Razorpay) throw new Error('Payment gateway failed to load. Please try again.')
  const Razorpay = window.Razorpay

  return new Promise((resolve, reject) => {
    const checkout = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: appName,
      description: order.planName,
      prefill: { name: order.customerName, email: order.customerEmail },
      theme: { color: '#6b3fa0' },
      handler: (r: RazorpaySuccess) =>
        resolve({
          razorpayOrderId: r.razorpay_order_id,
          razorpayPaymentId: r.razorpay_payment_id,
          razorpaySignature: r.razorpay_signature,
        }),
      modal: { ondismiss: () => reject(new Error('Payment cancelled.')) },
    })
    checkout.on('payment.failed', (response) =>
      reject(new Error(response.error?.description ?? 'Payment failed. Please try again.')),
    )
    checkout.open()
  })
}
