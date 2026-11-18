import { CalendarPlus, Copy, Trash2 } from 'lucide-react'
import { Button } from '../../ui/Button'
import { Toggle } from '../../ui/Surface'
import { DAYS } from '../../../lib/business'
import type { DayOfWeek, SpecialHour, WorkingHour } from '../../../types/business'
import { applyMondayToWeekdays, type FormErrors } from './businessForm'
import styles from './Profile.module.scss'

function tomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Weekly opening hours plus holiday / special dates that override them. */
export function BusinessWorkingHours({
  hours,
  special,
  onHours,
  onSpecial,
  errors,
}: {
  hours: WorkingHour[]
  special: SpecialHour[]
  onHours: (hours: WorkingHour[]) => void
  onSpecial: (special: SpecialHour[]) => void
  errors: FormErrors
}) {
  const ordered = DAYS.map((d) => hours.find((h) => h.day === d) ?? { day: d, isClosed: true, opens: null, closes: null })
  const update = (day: DayOfWeek, patch: Partial<WorkingHour>) =>
    onHours(ordered.map((h) => (h.day === day ? { ...h, ...patch } : h)))
  const updateSpecial = (i: number, patch: Partial<SpecialHour>) => onSpecial(special.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  return (
    <div className={styles.stack}>
      <div className={styles.sectionHead}>
        <div>
          <h3>Weekly opening hours</h3>
          <p>Customers see whether you’re open right now, in your local time.</p>
        </div>
        <Button size="sm" variant="secondary" icon={<Copy />} onClick={() => onHours(applyMondayToWeekdays(ordered))}>
          Copy Monday to Tue–Fri
        </Button>
      </div>
      <ul className={styles.hoursList}>
        {ordered.map((h) => (
          <li key={h.day} className={styles.hoursRow}>
            <div className={styles.hoursDay}>
              <Toggle
                checked={!h.isClosed}
                label={`${h.day} open`}
                onChange={(open) =>
                  update(h.day, open ? { isClosed: false, opens: h.opens ?? '10:00', closes: h.closes ?? '20:00' } : { isClosed: true })
                }
              />
              <span>{h.day}</span>
            </div>
            {h.isClosed ? (
              <span className={styles.closedTag}>Closed</span>
            ) : (
              <div className={styles.timeRange}>
                <input
                  type="time"
                  className={styles.timeInput}
                  aria-label={`${h.day} opens`}
                  value={h.opens ?? ''}
                  onChange={(e) => update(h.day, { opens: e.target.value })}
                />
                <span aria-hidden>–</span>
                <input
                  type="time"
                  className={styles.timeInput}
                  aria-label={`${h.day} closes`}
                  value={h.closes ?? ''}
                  onChange={(e) => update(h.day, { closes: e.target.value })}
                />
              </div>
            )}
            {errors[`hours.${h.day}`] && (
              <p className={styles.rowError} role="alert">
                {errors[`hours.${h.day}`]}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className={styles.sectionHead}>
        <div>
          <h3>Holidays & special dates</h3>
          <p>Override the weekly hours for festivals, holidays or events.</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          icon={<CalendarPlus />}
          onClick={() => onSpecial([...special, { date: tomorrow(), isClosed: true, opens: null, closes: null, note: null }])}
          disabled={special.length >= 60}
        >
          Add date
        </Button>
      </div>
      {special.length === 0 ? (
        <p className={styles.emptyHint}>No special dates yet.</p>
      ) : (
        <ul className={styles.specialList}>
          {special.map((s, i) => (
            <li key={i} className={styles.specialRow}>
              <input
                type="date"
                className={styles.timeInput}
                aria-label="Date"
                value={s.date}
                onChange={(e) => updateSpecial(i, { date: e.target.value })}
              />
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={s.isClosed}
                  onChange={(e) => updateSpecial(i, e.target.checked ? { isClosed: true } : { isClosed: false, opens: s.opens ?? '10:00', closes: s.closes ?? '14:00' })}
                />
                Closed all day
              </label>
              {!s.isClosed && (
                <div className={styles.timeRange}>
                  <input type="time" className={styles.timeInput} aria-label="Opens" value={s.opens ?? ''} onChange={(e) => updateSpecial(i, { opens: e.target.value })} />
                  <span aria-hidden>–</span>
                  <input type="time" className={styles.timeInput} aria-label="Closes" value={s.closes ?? ''} onChange={(e) => updateSpecial(i, { closes: e.target.value })} />
                </div>
              )}
              <input
                className={[styles.timeInput, styles.noteInput].join(' ')}
                aria-label="Note"
                placeholder="e.g. Diwali"
                maxLength={150}
                value={s.note ?? ''}
                onChange={(e) => updateSpecial(i, { note: e.target.value })}
              />
              <button type="button" className={styles.iconRemove} aria-label="Remove date" onClick={() => onSpecial(special.filter((_, j) => j !== i))}>
                <Trash2 />
              </button>
              {errors[`special.${i}`] && (
                <p className={styles.rowError} role="alert">
                  {errors[`special.${i}`]}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
