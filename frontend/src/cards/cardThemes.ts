/**
 * The 10 mobile profile-card designs viewers see after scanning the QR code.
 * Keys match ProfileTemplates.Key in the backend, so each mode's chosen template drives its card.
 */
export type HeroLayout = 'classic' | 'left' | 'cover' | 'split' | 'right'
export type SkillStyle = 'chips' | 'tiles'

export interface CardTheme {
  key: string
  name: string
  hero: HeroLayout
  skills: SkillStyle
  /** Services rendered as icon tiles instead of a list. */
  serviceTiles: boolean
  /** Shows the stats strip (experience / projects / skills). */
  stats: boolean
  /** Dark designs need light-on-dark controls. */
  dark: boolean
}

export const cardThemes: CardTheme[] = [
  { key: 'personal-branding', name: 'Classic Professional', hero: 'classic', skills: 'chips', serviceTiles: false, stats: false, dark: false },
  { key: 'modern-glass', name: 'Modern Glass', hero: 'left', skills: 'tiles', serviceTiles: false, stats: false, dark: true },
  { key: 'minimal', name: 'Minimal White', hero: 'left', skills: 'chips', serviceTiles: false, stats: false, dark: false },
  { key: 'premium-dark', name: 'Premium Dark', hero: 'left', skills: 'tiles', serviceTiles: false, stats: false, dark: true },
  { key: 'gradient-glass', name: 'Gradient Pro', hero: 'left', skills: 'chips', serviceTiles: true, stats: false, dark: true },
  { key: 'creative-portfolio', name: 'Creative Portfolio', hero: 'cover', skills: 'chips', serviceTiles: false, stats: false, dark: false },
  { key: 'corporate', name: 'Corporate Executive', hero: 'cover', skills: 'chips', serviceTiles: false, stats: false, dark: false },
  { key: 'split-layout', name: 'Modern Split', hero: 'split', skills: 'chips', serviceTiles: false, stats: false, dark: false },
  { key: 'neon-tech', name: 'Neon Tech', hero: 'left', skills: 'chips', serviceTiles: false, stats: true, dark: true },
  { key: 'elegant-white', name: 'Elegant Personal', hero: 'right', skills: 'chips', serviceTiles: true, stats: false, dark: false },
]

export function getCardTheme(key: string | null | undefined): CardTheme {
  return cardThemes.find((t) => t.key === key) ?? cardThemes.find((t) => t.key === 'modern-glass')!
}
