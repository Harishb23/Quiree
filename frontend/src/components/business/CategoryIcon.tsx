import {
  Briefcase,
  CakeSlice,
  Flower2,
  Footprints,
  Gem,
  GraduationCap,
  Scissors,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sofa,
  Stethoscope,
  Store,
  Utensils,
  type LucideIcon,
} from 'lucide-react'

/** Maps the category's icon name (stored server-side) to a Lucide icon. Unknown names fall back to a shop. */
const icons: Record<string, LucideIcon> = {
  footprints: Footprints,
  'flower-2': Flower2,
  shirt: Shirt,
  utensils: Utensils,
  'cake-slice': CakeSlice,
  gem: Gem,
  scissors: Scissors,
  smartphone: Smartphone,
  'shopping-basket': ShoppingBasket,
  sofa: Sofa,
  stethoscope: Stethoscope,
  'graduation-cap': GraduationCap,
  briefcase: Briefcase,
  store: Store,
}

export function CategoryIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = icons[name] ?? Store
  return <Icon size={size} aria-hidden />
}
