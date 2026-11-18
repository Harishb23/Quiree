import { ChevronDown } from 'lucide-react'
import styles from './Marketing.module.scss'

/** Accessible accordion built on native <details>; shared by the home and pricing pages. */
export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className={styles.faq}>
      {items.map((item) => (
        <details key={item.q}>
          <summary>
            {item.q}
            <ChevronDown size={18} aria-hidden />
          </summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  )
}
