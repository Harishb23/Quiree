import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '../ui/Button'
import styles from './Forms.module.scss'

interface RepeatableListProps<T> {
  items: T[]
  onChange: (items: T[]) => void
  createItem: () => T
  renderItem: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode
  itemTitle: (item: T, index: number) => string
  addLabel: string
  emptyText: string
  max?: number
}

/** Generic editor for ordered lists (experience, education, projects …) with add / remove / reorder. */
export function RepeatableList<T>({
  items,
  onChange,
  createItem,
  renderItem,
  itemTitle,
  addLabel,
  emptyText,
  max = 30,
}: RepeatableListProps<T>) {
  const update = (index: number, patch: Partial<T>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index))
  const move = (index: number, delta: number) => {
    const next = [...items]
    const [moved] = next.splice(index, 1)
    next.splice(index + delta, 0, moved!)
    onChange(next)
  }

  return (
    <div className={styles.repeatable}>
      {items.length === 0 && <div className={styles.emptyHint}>{emptyText}</div>}
      {items.map((item, index) => (
        <div key={index} className={styles.item}>
          <div className={styles.itemHeader}>
            <strong>{itemTitle(item, index) || `Item ${index + 1}`}</strong>
            <div className={styles.itemActions}>
              <button type="button" className={styles.itemBtn} onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">
                <ArrowUp />
              </button>
              <button
                type="button"
                className={styles.itemBtn}
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
                aria-label="Move down"
              >
                <ArrowDown />
              </button>
              <button
                type="button"
                className={[styles.itemBtn, styles.itemBtnDanger].join(' ')}
                onClick={() => remove(index)}
                aria-label="Remove"
              >
                <Trash2 />
              </button>
            </div>
          </div>
          {renderItem(item, (patch) => update(index, patch), index)}
        </div>
      ))}
      {items.length < max && (
        <div>
          <Button size="sm" variant="secondary" icon={<Plus />} onClick={() => onChange([...items, createItem()])}>
            {addLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
