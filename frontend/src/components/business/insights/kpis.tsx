import { Eye, Globe, Inbox, MapPin, MessageCircle, Package, Phone, QrCode, Users } from 'lucide-react'
import { formatMoney } from '../../../lib/format'
import type { AnalyticsTotals, Offer } from '../../../types/business'

/** Where each "missing" completion item can be fixed. Labels come from the server's completion check. */
export function completionLink(base: string, missing: string): string {
  if (missing.startsWith('At least one product')) return `${base}/products`
  if (missing.startsWith('Gallery')) return `${base}/gallery`
  if (missing.startsWith('Publish')) return `${base}/settings`
  return `${base}/profile`
}

export function kpis(t: AnalyticsTotals, p: AnalyticsTotals) {
  return [
    { key: 'qr', label: 'QR scans', value: t.qrScans, previous: p.qrScans, icon: <QrCode />, gold: true },
    { key: 'visitors', label: 'Unique visitors', value: t.uniqueVisitors, previous: p.uniqueVisitors, icon: <Users />, hint: 'Anonymous visitors, counted once per day' },
    { key: 'views', label: 'Profile views', value: t.profileViews, previous: p.profileViews, icon: <Eye /> },
    { key: 'products', label: 'Product views', value: t.productViews, previous: p.productViews, icon: <Package /> },
    { key: 'whatsapp', label: 'WhatsApp taps', value: t.whatsAppClicks, previous: p.whatsAppClicks, icon: <MessageCircle /> },
    { key: 'calls', label: 'Call taps', value: t.callClicks, previous: p.callClicks, icon: <Phone /> },
    { key: 'website', label: 'Website clicks', value: t.websiteClicks, previous: p.websiteClicks, icon: <Globe /> },
    { key: 'directions', label: 'Direction requests', value: t.directionsClicks, previous: p.directionsClicks, icon: <MapPin /> },
    { key: 'enquiries', label: 'Enquiries', value: t.enquiries, previous: p.enquiries, icon: <Inbox /> },
  ]
}

export function offerValue(o: Pick<Offer, 'discountPercent' | 'discountAmountInPaise'>): string | null {
  if (o.discountPercent) return `${o.discountPercent}% off`
  if (o.discountAmountInPaise) return `${formatMoney(o.discountAmountInPaise)} off`
  return null
}

