// Business profile API contracts. Mirrors backend ProLink.Application/DTOs/BusinessDtos.cs.

export type BusinessStatus = 'Draft' | 'Published'
export type BusinessRole = 'Owner' | 'Manager' | 'Editor'
export type BusinessSocialPlatform = 'Instagram' | 'Facebook' | 'YouTube' | 'LinkedIn' | 'Twitter' | 'WhatsApp' | 'Other'
export type PaymentMethod = 'Cash' | 'Upi' | 'Card' | 'NetBanking' | 'Wallet' | 'BankTransfer' | 'PayLater'
export type AttributeInputType = 'Text' | 'Number' | 'Select' | 'MultiSelect' | 'Boolean'
export type StockStatus = 'InStock' | 'LowStock' | 'OutOfStock' | 'MadeToOrder'
export type GalleryCategory = 'Interior' | 'Exterior' | 'Products' | 'Events' | 'Team' | 'Promotions'
export type ReviewStatus = 'Pending' | 'Approved' | 'Hidden'
export type EnquiryStatus = 'New' | 'InProgress' | 'Responded' | 'Closed'
export type EnquiryActivityType = 'Created' | 'StatusChanged' | 'Response' | 'Note'
export type OfferState = 'Live' | 'Scheduled' | 'Expired' | 'Inactive'
export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'
export type BusinessTheme = 'classic' | 'elegant' | 'bold' | 'minimal'
export type BusinessLayout = 'grid' | 'list'
export type SectionKey = 'offers' | 'products' | 'services' | 'gallery' | 'reviews' | 'info'
export type TrackableEvent =
  | 'ProfileView'
  | 'ProductView'
  | 'WhatsAppClick'
  | 'CallClick'
  | 'WebsiteClick'
  | 'DirectionsClick'
  | 'ShareClick'

export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ImageRef {
  id: string
  url: string
}

// ---------- Categories ----------

export interface BusinessSubcategory {
  id: number
  name: string
}

export interface BusinessCategory {
  id: number
  key: string
  name: string
  /** Lucide icon name, e.g. "flower-2". */
  icon: string
  subcategories: BusinessSubcategory[]
}

export interface CategoryAttribute {
  id: number
  key: string
  label: string
  inputType: AttributeInputType
  options: string[]
  isRequired: boolean
}

// ---------- Business profile ----------

export interface WorkingHour {
  day: DayOfWeek
  isClosed: boolean
  /** "HH:mm" 24-hour */
  opens: string | null
  closes: string | null
}

export interface SpecialHour {
  /** "yyyy-MM-dd" */
  date: string
  isClosed: boolean
  opens: string | null
  closes: string | null
  note: string | null
}

export interface BusinessSocialLink {
  platform: BusinessSocialPlatform
  label: string | null
  url: string
}

export interface BusinessUpsertRequest {
  name: string
  categoryId: number
  subcategoryId: number | null
  description: string | null
  yearEstablished: number | null
  email: string | null
  phone: string | null
  whatsApp: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  country: string | null
  postalCode: string | null
  mapsUrl: string | null
  latitude: number | null
  longitude: number | null
  timeZone: string | null
  workingHours: WorkingHour[]
  specialHours: SpecialHour[]
  deliveryAvailable: boolean
  pickupAvailable: boolean
  paymentMethods: PaymentMethod[]
  website: string | null
  socialLinks: BusinessSocialLink[]
  theme: BusinessTheme
  brandColor: string
  layout: BusinessLayout
  featuredSections: SectionKey[]
}

export interface ProfileCompletion {
  percent: number
  missing: string[]
}

export interface BusinessSummary {
  id: string
  name: string
  slug: string
  categoryName: string
  categoryIcon: string
  logoUrl: string | null
  city: string | null
  status: BusinessStatus
  myRole: BusinessRole
  publicUrl: string
  updatedAt: string
}

export interface BusinessDetail extends Omit<BusinessUpsertRequest, 'timeZone' | 'subcategoryId'> {
  id: string
  slug: string
  subcategoryId: number | null
  categoryName: string
  categoryIcon: string
  subcategoryName: string | null
  logoUrl: string | null
  coverUrl: string | null
  timeZone: string
  status: BusinessStatus
  isVerified: boolean
  publishedAt: string | null
  publicUrl: string
  myRole: BusinessRole
  completion: ProfileCompletion
  createdAt: string
  updatedAt: string
}

export interface BusinessMember {
  userId: string
  fullName: string
  email: string
  role: BusinessRole
  isOwner: boolean
  addedAt: string
}

// ---------- Catalogue ----------

export interface ProductCategory {
  id: string
  name: string
  productCount: number
}

export interface ProductUpsertRequest {
  name: string
  sku: string | null
  productCategoryId: string | null
  description: string | null
  priceInPaise: number | null
  discountPriceInPaise: number | null
  stock: StockStatus
  isAvailable: boolean
  isFeatured: boolean
  /** attribute key → value; MultiSelect values comma-separated, Boolean "true"/"false". */
  attributes: Record<string, string>
}

export interface Product extends ProductUpsertRequest {
  id: string
  productCategoryName: string | null
  currency: string
  images: ImageRef[]
  createdAt: string
  updatedAt: string
}

export type ProductSort = 'newest' | 'oldest' | 'name' | 'price_asc' | 'price_desc'

export interface ProductQuery {
  search?: string
  categoryId?: string
  stock?: StockStatus
  featured?: boolean
  available?: boolean
  sort?: ProductSort
  page?: number
  pageSize?: number
}

export interface ServiceUpsertRequest {
  name: string
  description: string | null
  priceInPaise: number | null
  priceNote: string | null
  durationMinutes: number | null
  isAvailable: boolean
  isFeatured: boolean
}

export interface BusinessServiceItem extends ServiceUpsertRequest {
  id: string
  currency: string
  imageUrl: string | null
  updatedAt: string
}

export interface OfferUpsertRequest {
  title: string
  description: string | null
  discountPercent: number | null
  discountAmountInPaise: number | null
  /** "yyyy-MM-dd" */
  startDate: string | null
  endDate: string | null
  isActive: boolean
  isFeatured: boolean
}

export interface Offer extends OfferUpsertRequest {
  id: string
  bannerUrl: string | null
  state: OfferState
  updatedAt: string
}

export interface GalleryImage {
  id: string
  url: string
  category: GalleryCategory
  caption: string | null
  createdAt: string
}

// ---------- QR ----------

export interface BusinessQr {
  qrCode: string
  /** What the QR encodes: {origin}/bq/{code} */
  qrUrl: string
  publicUrl: string
  enabled: boolean
  isPublished: boolean
  generatedAt: string
  totalScans: number
  scansLast30Days: number
}

// ---------- Reviews & enquiries ----------

export interface Review {
  id: string
  customerName: string
  rating: number
  comment: string | null
  status: ReviewStatus
  ownerReply: string | null
  createdAt: string
}

export interface RatingSummary {
  average: number
  count: number
  /** Index 0 = 1 star … index 4 = 5 stars */
  distribution: number[]
}

export interface EnquiryRequest {
  customerName: string
  phone: string | null
  email: string | null
  subject: string
  message: string
  productId?: string | null
  serviceId?: string | null
}

export interface EnquirySummary {
  id: string
  customerName: string
  phone: string | null
  email: string | null
  subject: string
  messagePreview: string
  relatedItemName: string | null
  status: EnquiryStatus
  createdAt: string
  updatedAt: string
}

export interface EnquiryActivity {
  id: string
  type: EnquiryActivityType
  status: EnquiryStatus | null
  message: string | null
  byName: string | null
  createdAt: string
}

export interface EnquiryDetail {
  id: string
  customerName: string
  phone: string | null
  email: string | null
  subject: string
  message: string
  productId: string | null
  serviceId: string | null
  relatedItemName: string | null
  status: EnquiryStatus
  createdAt: string
  activities: EnquiryActivity[]
}

export interface EnquiryQuery {
  status?: EnquiryStatus
  search?: string
  page?: number
  pageSize?: number
}

// ---------- Analytics & dashboard ----------

export interface AnalyticsTotals {
  qrScans: number
  /** Distinct anonymous visitors per day, summed over the period. */
  uniqueVisitors: number
  profileViews: number
  productViews: number
  whatsAppClicks: number
  callClicks: number
  websiteClicks: number
  directionsClicks: number
  shareClicks: number
  enquiries: number
}

export interface AnalyticsDailyPoint {
  date: string
  views: number
  scans: number
  clicks: number
  visitors: number
}

export interface TopProduct {
  productId: string
  name: string
  imageUrl: string | null
  views: number
}

export interface BusinessAnalytics {
  from: string
  to: string
  days: number
  totals: AnalyticsTotals
  previousTotals: AnalyticsTotals
  daily: AnalyticsDailyPoint[]
  topProducts: TopProduct[]
}

export interface ActivityItem {
  /** scan | view | product | whatsapp | call | website | directions | share | enquiry | review */
  kind: string
  title: string
  detail: string | null
  occurredAt: string
}

export interface BusinessDashboard {
  business: BusinessSummary
  completion: ProfileCompletion
  qrEnabled: boolean
  analytics: BusinessAnalytics
  productCount: number
  serviceCount: number
  galleryCount: number
  newEnquiries: number
  pendingReviews: number
  activeOffers: Offer[]
  recentEnquiries: EnquirySummary[]
  recentActivity: ActivityItem[]
}

// ---------- Public storefront ----------

export interface PublicAttribute {
  key: string
  label: string
  value: string
}

export interface PublicProduct {
  id: string
  name: string
  description: string | null
  priceInPaise: number | null
  discountPriceInPaise: number | null
  currency: string
  stock: StockStatus
  isFeatured: boolean
  categoryId: string | null
  categoryName: string | null
  attributes: PublicAttribute[]
  images: string[]
}

export interface PublicService {
  id: string
  name: string
  description: string | null
  priceInPaise: number | null
  priceNote: string | null
  currency: string
  durationMinutes: number | null
  imageUrl: string | null
  isFeatured: boolean
}

export interface PublicOffer {
  id: string
  title: string
  description: string | null
  discountPercent: number | null
  discountAmountInPaise: number | null
  bannerUrl: string | null
  endDate: string | null
  isFeatured: boolean
}

export interface PublicGalleryImage {
  url: string
  category: GalleryCategory
  caption: string | null
}

export interface PublicReview {
  customerName: string
  rating: number
  comment: string | null
  ownerReply: string | null
  createdAt: string
}

export interface PublicBusiness {
  slug: string
  name: string
  categoryName: string
  categoryIcon: string
  subcategoryName: string | null
  logoUrl: string | null
  coverUrl: string | null
  description: string | null
  yearEstablished: number | null
  isVerified: boolean
  email: string | null
  phone: string | null
  whatsApp: string | null
  website: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  country: string | null
  postalCode: string | null
  mapsUrl: string | null
  latitude: number | null
  longitude: number | null
  timeZone: string
  workingHours: WorkingHour[]
  upcomingSpecialHours: SpecialHour[]
  deliveryAvailable: boolean
  pickupAvailable: boolean
  paymentMethods: PaymentMethod[]
  socialLinks: BusinessSocialLink[]
  theme: BusinessTheme
  brandColor: string
  layout: BusinessLayout
  featuredSections: SectionKey[]
  productCategories: ProductCategory[]
  featuredProducts: PublicProduct[]
  totalProducts: number
  services: PublicService[]
  offers: PublicOffer[]
  gallery: PublicGalleryImage[]
  reviews: PublicReview[]
  rating: RatingSummary
  publicUrl: string
  isPreview: boolean
}

// ---------- QR campaigns ----------

export type QrDestination = 'Profile' | 'Product' | 'Offer' | 'Products' | 'Services' | 'Reviews' | 'Enquiry' | 'Gallery'

export interface QrResolveResult {
  slug: string
  destination: QrDestination
  targetId: string | null
}

export interface QrCampaignStyle {
  foregroundColor: string
  backgroundColor: string
  showLogo: boolean
  frameText: string | null
}

export interface QrCampaignUpsertRequest extends QrCampaignStyle {
  name: string
  destination: QrDestination
  targetId: string | null
  isEnabled: boolean
  /** ISO UTC instant, or null for no expiry. */
  expiresAt: string | null
}

export interface BulkQrCampaignRequest extends QrCampaignStyle {
  namePrefix: string
  count: number
  startNumber: number
  destination: QrDestination
}

export interface QrCampaign extends QrCampaignUpsertRequest {
  id: string
  code: string
  qrUrl: string
  targetName: string | null
  isExpired: boolean
  totalScans: number
  scansLast30Days: number
  createdAt: string
}

export interface QrCampaignStatsItem {
  /** null = main storefront QR; all-zero GUID = deleted campaigns */
  campaignId: string | null
  name: string
  scans: number
  uniqueVisitors: number
  daily: number[]
}

export interface QrCampaignStats {
  from: string
  to: string
  days: number
  items: QrCampaignStatsItem[]
}
