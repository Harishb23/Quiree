import type { ComponentType, ReactNode } from 'react'
import type { PublicMode } from '../types/api'

/**
 * Contract every resume template implements. Templates are pure presentational components:
 * all data arrives through props (from the backend), nothing is hard-coded.
 */
export interface TemplateProps {
  fullName: string
  photoUrl: string | null
  /** Permanent public profile URL (same URL as the QR code). */
  permanentUrl: string
  mode: PublicMode
  /** Viewer actions (Save Contact, Share, Add to Home Screen). Templates place this in their contact area. */
  actions?: ReactNode
  /** True when rendered as a miniature (gallery thumbnails): disable animations / heavy effects. */
  compact?: boolean
}

export interface TemplateDefinition {
  key: string
  name: string
  component: ComponentType<TemplateProps>
}
