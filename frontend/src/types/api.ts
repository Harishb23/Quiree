// Mirrors the backend DTOs (ProLink.Application.DTOs). Enums are serialized as strings.

export type ModeType = 'General' | 'Developer' | 'HR' | 'Entrepreneur' | 'Marketing' | 'Consultant'

export type SocialPlatform =
  | 'LinkedIn'
  | 'Instagram'
  | 'Facebook'
  | 'WhatsApp'
  | 'GitHub'
  | 'Twitter'
  | 'YouTube'
  | 'Website'

export type SubscriptionStatus = 'Pending' | 'Active' | 'Expired' | 'Cancelled'
export type PaymentStatus = 'Created' | 'Captured' | 'Failed'

// ---------- Auth ----------

/** Chosen at registration: Personal (profile modes) or Business (business profiles). */
export type AccountType = 'Personal' | 'Business'

export interface CurrentUser {
  id: string
  email: string
  fullName: string
  photoUrl: string | null
  role: 'User' | 'Admin'
  publicSlug: string
  publicUrl: string
  hasPassword: boolean
  hasGoogle: boolean
  accountType: AccountType
}

export interface AuthResponse {
  accessToken: string
  expiresAt: string
  user: CurrentUser
}

export interface RegisterRequest {
  fullName: string
  email: string
  password: string
  username?: string
  accountType: AccountType
}

export interface UsernameAvailability {
  username: string
  available: boolean
  reason: string | null
}

// ---------- Profile ----------

export interface SocialLink {
  platform: SocialPlatform
  url: string
}

export interface Profile {
  fullName: string
  photoUrl: string | null
  email: string | null
  mobile: string | null
  location: string | null
  website: string | null
  summary: string | null
  socialLinks: SocialLink[]
  updatedAt: string
}

export type UpdateProfileRequest = Omit<Profile, 'photoUrl' | 'updatedAt'>

// ---------- Mode sections ----------

export interface Skill {
  name: string
  category?: string | null
  level?: number | null
}

export interface WorkExperience {
  title: string
  company: string
  location?: string | null
  startDate?: string | null
  endDate?: string | null
  isCurrent: boolean
  description?: string | null
  /** Newline separated */
  responsibilities?: string | null
}

export interface Education {
  degree: string
  institution: string
  fieldOfStudy?: string | null
  startYear?: number | null
  endYear?: number | null
  grade?: string | null
  description?: string | null
}

export interface ProjectItem {
  title: string
  role?: string | null
  description?: string | null
  techStack?: string | null
  outcome?: string | null
  url?: string | null
}

export interface Achievement {
  title: string
  description?: string | null
  date?: string | null
}

export interface Certification {
  name: string
  issuer?: string | null
  issueDate?: string | null
  credentialUrl?: string | null
}

export interface ServiceItem {
  name: string
  description?: string | null
}

export interface CustomSection {
  title: string
  content: string
}

export interface ModeSections {
  skills: Skill[]
  workExperiences: WorkExperience[]
  educations: Education[]
  projects: ProjectItem[]
  achievements: Achievement[]
  certifications: Certification[]
  services: ServiceItem[]
  customSections: CustomSection[]
  socialLinks: SocialLink[]
}

export interface ModeFields {
  modeName: string
  modeType: ModeType
  designation: string | null
  companyName: string | null
  summary: string | null
  contactEmail: string | null
  contactPhone: string | null
  location: string | null
  website: string | null
  businessName: string | null
  industry: string | null
  businessDescription: string | null
  companyWebsite: string | null
  gitHubUrl: string | null
  isPublished: boolean
}

export type ModeUpsertRequest = ModeFields & ModeSections & { templateId?: number | null }

export interface ModeSummary {
  id: string
  modeName: string
  modeType: ModeType
  designation: string | null
  companyName: string | null
  isPublished: boolean
  isDefault: boolean
  sortOrder: number
  templateId: number | null
  templateKey: string | null
  templateName: string | null
  updatedAt: string
}

export interface ModeDetail extends ModeFields, ModeSections {
  id: string
  isDefault: boolean
  sortOrder: number
  templateId: number | null
  templateKey: string | null
  updatedAt: string
}

// ---------- Public profile ----------

export interface PublicContact {
  email: string | null
  phone: string | null
  location: string | null
  website: string | null
}

export interface PublicMode extends ModeSections {
  id: string
  modeName: string
  modeType: ModeType
  designation: string | null
  companyName: string | null
  summary: string | null
  businessName: string | null
  industry: string | null
  businessDescription: string | null
  companyWebsite: string | null
  gitHubUrl: string | null
  templateKey: string
  contact: PublicContact
}

export interface PublicProfile {
  slug: string
  permanentUrl: string
  fullName: string
  photoUrl: string | null
  allowViewerModeSelection: boolean
  defaultModeId: string | null
  modes: PublicMode[]
}

export interface QrCodeInfo {
  publicSlug: string
  permanentUrl: string
  qrReference: string
  generatedAt: string
  isPublic: boolean
}

// ---------- Templates ----------

export interface TemplateInfo {
  id: number
  key: string
  name: string
  description: string
  isPremium: boolean
  isLocked: boolean
}

// ---------- Subscription ----------

export interface Plan {
  id: number
  code: string
  name: string
  description: string
  priceInPaise: number
  currency: string
  durationDays: number
  maxModes: number
  allowsPremiumTemplates: boolean
}

export interface Entitlements {
  planCode: string
  planName: string
  maxModes: number
  allowsPremiumTemplates: boolean
  isPaid: boolean
  expiresAt: string | null
  /** Promotional switch on the server: every feature and template is free and purchases are paused. */
  allFeaturesUnlocked?: boolean
}

export interface SubscriptionStatusInfo {
  entitlements: Entitlements
  subscriptionId: string | null
  status: SubscriptionStatus | null
  startsAt: string | null
  expiresAt: string | null
  daysRemaining: number | null
}

export interface CreateOrderResponse {
  orderId: string
  amount: number
  currency: string
  keyId: string
  planName: string
  customerName: string
  customerEmail: string
}

export interface VerifyPaymentRequest {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

export interface PaymentRecord {
  id: string
  planName: string
  amountInPaise: number
  currency: string
  status: PaymentStatus
  razorpayOrderId: string
  razorpayPaymentId: string | null
  createdAt: string
  paidAt: string | null
}

// ---------- Misc ----------

export interface DashboardOverview {
  totalModes: number
  publishedModes: number
  activeModeName: string | null
  activeModeId: string | null
  selectedTemplateName: string | null
  qrStatus: string
  publicUrl: string
  isPublic: boolean
  subscription: Entitlements
  profileCompletion: number
}

export interface PublicSettings {
  isPublic: boolean
  allowViewerModeSelection: boolean
  permanentUrl: string
}

export interface EnquiryRequest {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
}
