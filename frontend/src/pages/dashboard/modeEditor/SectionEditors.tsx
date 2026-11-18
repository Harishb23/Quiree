import { useId, useState } from 'react'
import { Plus, X } from 'lucide-react'
import type {
  Achievement,
  Certification,
  CustomSection,
  Education,
  ProjectItem,
  ServiceItem,
  Skill,
  WorkExperience,
} from '../../../types/api'
import { Button } from '../../../components/ui/Button'
import { TextArea, TextField } from '../../../components/ui/Field'
import { RepeatableList } from '../../../components/forms/RepeatableList'
import { groupBy } from '../../../lib/format'
import forms from '../../../components/forms/Forms.module.scss'
import styles from '../Dashboard.module.scss'

type Errors = Record<string, string>
const monthValue = (date?: string | null) => (date ? date.slice(0, 7) : '')
const fromMonth = (value: string) => (value ? `${value}-01` : null)
const numberOrNull = (value: string) => (value ? Number(value) : null)

export function SkillsEditor({
  skills,
  onChange,
  suggestedCategories,
}: {
  skills: Skill[]
  onChange: (skills: Skill[]) => void
  suggestedCategories: string[]
}) {
  const listId = useId()
  const [name, setName] = useState('')
  const [category, setCategory] = useState(suggestedCategories[0] ?? '')

  function add() {
    const n = name.trim()
    if (!n) return
    const exists = skills.some(
      (s) => s.name.toLowerCase() === n.toLowerCase() && (s.category ?? '') === category.trim(),
    )
    if (!exists && skills.length < 60) onChange([...skills, { name: n, category: category.trim() || null }])
    setName('')
  }

  const groups = groupBy(skills, (s) => s.category, 'Other Skills')

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className={forms.inlineAdd}>
        <TextField
          label="Skill"
          placeholder="e.g. React, Payroll, SEO"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <TextField
          label="Category"
          list={listId}
          placeholder="Category"
          value={category}
          maxLength={80}
          onChange={(e) => setCategory(e.target.value)}
        />
        <datalist id={listId}>
          {suggestedCategories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div style={{ alignSelf: 'flex-end' }}>
          <Button icon={<Plus />} onClick={add} disabled={!name.trim()}>
            Add
          </Button>
        </div>
      </div>
      <div className={forms.chipRow}>
        {suggestedCategories.map((c) => (
          <Button key={c} size="sm" variant={c === category ? 'primary' : 'secondary'} onClick={() => setCategory(c)}>
            {c}
          </Button>
        ))}
      </div>
      {skills.length === 0 ? (
        <div className={forms.emptyHint}>No skills yet. Add skills and group them by category.</div>
      ) : (
        groups.map((g) => (
          <div key={g.name} className={forms.skillGroup}>
            <h4>{g.name}</h4>
            <div className={forms.tags}>
              {g.items.map((s) => (
                <span key={`${s.category}-${s.name}`} className={forms.tag}>
                  {s.name}
                  <button type="button" aria-label={`Remove ${s.name}`} onClick={() => onChange(skills.filter((x) => x !== s))}>
                    <X />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export function ExperienceEditor({ items, onChange, errors }: { items: WorkExperience[]; onChange: (v: WorkExperience[]) => void; errors: Errors }) {
  return (
    <RepeatableList
      items={items}
      onChange={onChange}
      addLabel="Add experience"
      emptyText="Add your roles — they render as a timeline on your resume."
      itemTitle={(w) => [w.title, w.company].filter(Boolean).join(' · ')}
      createItem={(): WorkExperience => ({ title: '', company: '', isCurrent: false, startDate: null, endDate: null })}
      renderItem={(w, update, i) => (
        <div className={styles.formGrid}>
          <TextField label="Job title" required value={w.title} maxLength={120} error={errors[`workExperiences.${i}.title`]} onChange={(e) => update({ title: e.target.value })} />
          <TextField label="Company" required value={w.company} maxLength={150} error={errors[`workExperiences.${i}.company`]} onChange={(e) => update({ company: e.target.value })} />
          <TextField label="Start" type="month" value={monthValue(w.startDate)} onChange={(e) => update({ startDate: fromMonth(e.target.value) })} />
          <TextField
            label="End"
            type="month"
            value={monthValue(w.endDate)}
            disabled={w.isCurrent}
            error={errors[`workExperiences.${i}.endDate`]}
            onChange={(e) => update({ endDate: fromMonth(e.target.value) })}
          />
          <label className={styles.span2} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={w.isCurrent} onChange={(e) => update({ isCurrent: e.target.checked, endDate: null })} />
            I currently work here
          </label>
          <TextField label="Location" value={w.location ?? ''} maxLength={150} onChange={(e) => update({ location: e.target.value })} />
          <div />
          <TextArea className={styles.span2} label="Description" rows={2} maxLength={2000} value={w.description ?? ''} onChange={(e) => update({ description: e.target.value })} />
          <TextArea
            className={styles.span2}
            label="Responsibilities & highlights"
            hint="One per line — shown as bullet points."
            rows={4}
            maxLength={4000}
            value={w.responsibilities ?? ''}
            onChange={(e) => update({ responsibilities: e.target.value })}
          />
        </div>
      )}
    />
  )
}

export function EducationEditor({ items, onChange, errors }: { items: Education[]; onChange: (v: Education[]) => void; errors: Errors }) {
  return (
    <RepeatableList
      items={items}
      onChange={onChange}
      addLabel="Add education"
      emptyText="Add degrees, diplomas or courses."
      max={20}
      itemTitle={(e) => [e.degree, e.institution].filter(Boolean).join(' · ')}
      createItem={(): Education => ({ degree: '', institution: '' })}
      renderItem={(ed, update, i) => (
        <div className={styles.formGrid}>
          <TextField label="Degree" required value={ed.degree} maxLength={150} error={errors[`educations.${i}.degree`]} onChange={(e) => update({ degree: e.target.value })} />
          <TextField label="Institution" required value={ed.institution} maxLength={200} error={errors[`educations.${i}.institution`]} onChange={(e) => update({ institution: e.target.value })} />
          <TextField label="Field of study" value={ed.fieldOfStudy ?? ''} maxLength={150} onChange={(e) => update({ fieldOfStudy: e.target.value })} />
          <TextField label="Grade / score" value={ed.grade ?? ''} maxLength={50} onChange={(e) => update({ grade: e.target.value })} />
          <TextField label="Start year" type="number" min={1950} max={2100} value={ed.startYear ?? ''} onChange={(e) => update({ startYear: numberOrNull(e.target.value) })} />
          <TextField label="End year" type="number" min={1950} max={2100} value={ed.endYear ?? ''} error={errors[`educations.${i}.endYear`]} onChange={(e) => update({ endYear: numberOrNull(e.target.value) })} />
          <TextArea className={styles.span2} label="Description" rows={2} maxLength={1000} value={ed.description ?? ''} onChange={(e) => update({ description: e.target.value })} />
        </div>
      )}
    />
  )
}

export function ProjectsEditor({
  items,
  onChange,
  errors,
  outcomeLabel = 'Outcome / results',
}: {
  items: ProjectItem[]
  onChange: (v: ProjectItem[]) => void
  errors: Errors
  outcomeLabel?: string
}) {
  return (
    <RepeatableList
      items={items}
      onChange={onChange}
      addLabel="Add project"
      emptyText="Showcase projects, campaigns or business initiatives."
      itemTitle={(p) => p.title}
      createItem={(): ProjectItem => ({ title: '' })}
      renderItem={(p, update, i) => (
        <div className={styles.formGrid}>
          <TextField label="Title" required value={p.title} maxLength={150} error={errors[`projects.${i}.title`]} onChange={(e) => update({ title: e.target.value })} />
          <TextField label="Your role" value={p.role ?? ''} maxLength={120} onChange={(e) => update({ role: e.target.value })} />
          <TextField label="Tech stack / tools" value={p.techStack ?? ''} maxLength={300} placeholder="Comma separated" onChange={(e) => update({ techStack: e.target.value })} />
          <TextField label="Link" value={p.url ?? ''} maxLength={500} error={errors[`projects.${i}.url`]} placeholder="https://" onChange={(e) => update({ url: e.target.value })} />
          <TextArea className={styles.span2} label="Description" rows={3} maxLength={2000} value={p.description ?? ''} onChange={(e) => update({ description: e.target.value })} />
          <TextArea className={styles.span2} label={outcomeLabel} rows={2} maxLength={1000} value={p.outcome ?? ''} onChange={(e) => update({ outcome: e.target.value })} />
        </div>
      )}
    />
  )
}

export function AchievementsEditor({ items, onChange, errors }: { items: Achievement[]; onChange: (v: Achievement[]) => void; errors: Errors }) {
  return (
    <RepeatableList
      items={items}
      onChange={onChange}
      addLabel="Add achievement"
      emptyText="Awards, recognitions and milestones."
      itemTitle={(a) => a.title}
      createItem={(): Achievement => ({ title: '' })}
      renderItem={(a, update, i) => (
        <div className={styles.formGrid}>
          <TextField label="Title" required value={a.title} maxLength={200} error={errors[`achievements.${i}.title`]} onChange={(e) => update({ title: e.target.value })} />
          <TextField label="Date" type="date" value={a.date ?? ''} onChange={(e) => update({ date: e.target.value || null })} />
          <TextArea className={styles.span2} label="Description" rows={2} maxLength={1000} value={a.description ?? ''} onChange={(e) => update({ description: e.target.value })} />
        </div>
      )}
    />
  )
}

export function CertificationsEditor({ items, onChange, errors }: { items: Certification[]; onChange: (v: Certification[]) => void; errors: Errors }) {
  return (
    <RepeatableList
      items={items}
      onChange={onChange}
      addLabel="Add certification"
      emptyText="Professional certifications and licences."
      itemTitle={(c) => c.name}
      createItem={(): Certification => ({ name: '' })}
      renderItem={(c, update, i) => (
        <div className={styles.formGrid}>
          <TextField label="Name" required value={c.name} maxLength={200} error={errors[`certifications.${i}.name`]} onChange={(e) => update({ name: e.target.value })} />
          <TextField label="Issuer" value={c.issuer ?? ''} maxLength={150} onChange={(e) => update({ issuer: e.target.value })} />
          <TextField label="Issue date" type="date" value={c.issueDate ?? ''} onChange={(e) => update({ issueDate: e.target.value || null })} />
          <TextField label="Credential URL" value={c.credentialUrl ?? ''} maxLength={500} error={errors[`certifications.${i}.credentialUrl`]} onChange={(e) => update({ credentialUrl: e.target.value })} />
        </div>
      )}
    />
  )
}

export function ServicesEditor({ items, onChange, errors, label }: { items: ServiceItem[]; onChange: (v: ServiceItem[]) => void; errors: Errors; label: string }) {
  return (
    <RepeatableList
      items={items}
      onChange={onChange}
      addLabel={`Add ${label.toLowerCase()}`}
      emptyText="List what you offer to clients or employers."
      itemTitle={(s) => s.name}
      createItem={(): ServiceItem => ({ name: '' })}
      renderItem={(s, update, i) => (
        <div className={styles.formGrid}>
          <TextField className={styles.span2} label="Name" required value={s.name} maxLength={150} error={errors[`services.${i}.name`]} onChange={(e) => update({ name: e.target.value })} />
          <TextArea className={styles.span2} label="Description" rows={2} maxLength={1000} value={s.description ?? ''} onChange={(e) => update({ description: e.target.value })} />
        </div>
      )}
    />
  )
}

export function CustomSectionsEditor({ items, onChange, errors }: { items: CustomSection[]; onChange: (v: CustomSection[]) => void; errors: Errors }) {
  return (
    <RepeatableList
      items={items}
      onChange={onChange}
      addLabel="Add custom section"
      emptyText="Anything else — languages, volunteering, publications, interests…"
      max={10}
      itemTitle={(c) => c.title}
      createItem={(): CustomSection => ({ title: '', content: '' })}
      renderItem={(c, update, i) => (
        <div style={{ display: 'grid', gap: 14 }}>
          <TextField label="Section title" required value={c.title} maxLength={100} error={errors[`customSections.${i}.title`]} onChange={(e) => update({ title: e.target.value })} />
          <TextArea label="Content" required rows={4} maxLength={4000} value={c.content} error={errors[`customSections.${i}.content`]} onChange={(e) => update({ content: e.target.value })} />
        </div>
      )}
    />
  )
}
