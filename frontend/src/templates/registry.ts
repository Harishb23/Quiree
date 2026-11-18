import type { TemplateDefinition } from './types'
import ModernGlass from './modern-glass/ModernGlass'
import PremiumDark from './premium-dark/PremiumDark'
import Minimal from './minimal/Minimal'
import Corporate from './corporate/Corporate'
import GradientGlass from './gradient-glass/GradientGlass'
import CreativePortfolio from './creative-portfolio/CreativePortfolio'
import ElegantWhite from './elegant-white/ElegantWhite'
import SplitLayout from './split-layout/SplitLayout'
import NeonTech from './neon-tech/NeonTech'
import PersonalBranding from './personal-branding/PersonalBranding'

// Keys must match ProfileTemplates.Key seeded in the backend (SeedData.cs).
// Order and names follow the template design sheet (1 Classic Professional … 10 Elegant Personal).
export const templates: TemplateDefinition[] = [
  { key: 'personal-branding', name: 'Classic Professional', component: PersonalBranding },
  { key: 'modern-glass', name: 'Modern Glass', component: ModernGlass },
  { key: 'minimal', name: 'Minimal White', component: Minimal },
  { key: 'premium-dark', name: 'Premium Dark', component: PremiumDark },
  { key: 'gradient-glass', name: 'Gradient Pro', component: GradientGlass },
  { key: 'creative-portfolio', name: 'Creative Portfolio', component: CreativePortfolio },
  { key: 'corporate', name: 'Corporate Executive', component: Corporate },
  { key: 'split-layout', name: 'Modern Split', component: SplitLayout },
  { key: 'neon-tech', name: 'Neon Tech', component: NeonTech },
  { key: 'elegant-white', name: 'Elegant Personal', component: ElegantWhite },
]

export const DEFAULT_TEMPLATE_KEY = 'modern-glass'

export function getTemplate(key: string | null | undefined): TemplateDefinition {
  return templates.find((t) => t.key === key) ?? templates.find((t) => t.key === DEFAULT_TEMPLATE_KEY)!
}
