import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PublicMode } from '../types/api'
import { TemplateRenderer, TemplateThumbnail, getTemplate, templates } from '.'

const fullMode: PublicMode = {
  id: 'mode-1',
  modeName: 'Software Developer',
  modeType: 'Developer',
  designation: 'Lead Engineer',
  companyName: 'Acme Corp',
  summary: 'Builds reliable platforms.\nLoves mentoring.',
  businessName: 'Verma Labs',
  industry: 'Software',
  businessDescription: 'Consulting studio for cloud products.',
  companyWebsite: 'https://acme.example',
  gitHubUrl: 'https://github.com/asha',
  templateKey: 'modern-glass',
  contact: { email: 'asha@example.com', phone: '+91 98765 43210', location: 'Chennai, India', website: 'https://asha.dev' },
  skills: [
    { name: 'TypeScript', category: 'Programming Languages', level: 90 },
    { name: 'React', category: 'Frameworks', level: 85 },
    { name: 'Mentoring', category: null },
  ],
  workExperiences: [
    {
      title: 'Senior Platform Engineer',
      company: 'Acme Corp',
      location: 'Remote',
      startDate: '2021-03-01',
      endDate: null,
      isCurrent: true,
      description: 'Owns the data platform.',
      responsibilities: 'Led a team of 6\n- Cut infra cost by 30%',
    },
  ],
  educations: [{ degree: 'B.E.', institution: 'Anna University', fieldOfStudy: 'CSE', startYear: 2012, endYear: 2016 }],
  projects: [
    {
      title: 'Realtime Analytics',
      role: 'Architect',
      description: 'Streaming dashboards.',
      techStack: 'SignalR, Kafka',
      outcome: '2x faster insights',
      url: 'https://example.com/project',
    },
  ],
  achievements: [{ title: 'Engineer of the Year', description: 'Company award', date: '2023-01-01' }],
  certifications: [{ name: 'AWS Solutions Architect', issuer: 'AWS', issueDate: '2022-05-01', credentialUrl: 'https://aws.example/cert' }],
  services: [{ name: 'Architecture Reviews', description: 'Two-week engagements' }],
  customSections: [{ title: 'Volunteering', content: 'Teaches coding to kids.' }],
  socialLinks: [
    { platform: 'LinkedIn', url: 'https://linkedin.com/in/asha' },
    { platform: 'Twitter', url: 'javascript:alert(1)' },
  ],
}

const emptyMode: PublicMode = {
  ...fullMode,
  id: 'mode-2',
  designation: 'Consultant',
  companyName: null,
  summary: null,
  businessName: null,
  industry: null,
  businessDescription: null,
  companyWebsite: null,
  gitHubUrl: null,
  contact: { email: null, phone: null, location: null, website: null },
  skills: [],
  workExperiences: [],
  educations: [],
  projects: [],
  achievements: [],
  certifications: [],
  services: [],
  customSections: [],
  socialLinks: [],
}

const base = { fullName: 'Asha Verma', photoUrl: null, permanentUrl: 'https://prolink.example/p/asha' }

describe('template registry', () => {
  it('registers ten templates with unique keys', () => {
    expect(templates).toHaveLength(10)
    expect(new Set(templates.map((t) => t.key)).size).toBe(10)
  })

  it('falls back to modern-glass for unknown keys', () => {
    expect(getTemplate('does-not-exist').key).toBe('modern-glass')
  })
})

describe.each(templates.map((t) => [t.key, t] as const))('%s template', (key) => {
  it('renders a complete resume from mode data', () => {
    const { container } = render(
      <TemplateRenderer
        {...base}
        templateKey={key}
        mode={fullMode}
        actions={<button type="button">Save Contact</button>}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Asha Verma' })).toBeInTheDocument()
    expect(screen.getAllByText(/Lead Engineer/).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Senior Platform Engineer' })).toBeInTheDocument()
    expect(screen.getByText('Cut infra cost by 30%')).toBeInTheDocument()
    expect(screen.getAllByText('TypeScript').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Realtime Analytics' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /AWS Solutions Architect/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Volunteering/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Contact' })).toBeInTheDocument()

    // Contact uses safe protocol links
    expect(container.querySelector('a[href="mailto:asha@example.com"]')).not.toBeNull()
    expect(container.querySelector('a[href="tel:+919876543210"]')).not.toBeNull()

    // Unsafe social URLs are dropped, safe ones kept
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '')
    expect(hrefs.some((h) => h.toLowerCase().startsWith('javascript:'))).toBe(false)
    expect(hrefs).toContain('https://linkedin.com/in/asha')
    expect(hrefs).toContain('https://prolink.example/p/asha')
  })

  it('omits sections that have no data', () => {
    render(<TemplateRenderer {...base} templateKey={key} mode={emptyMode} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Asha Verma' })).toBeInTheDocument()
    expect(screen.getAllByText(/Consultant/).length).toBeGreaterThan(0)
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0)
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  it('renders as a non-interactive thumbnail', () => {
    const { container } = render(<TemplateThumbnail {...base} templateKey={key} mode={fullMode} />)
    const frame = container.firstElementChild as HTMLElement
    expect(frame).toHaveAttribute('aria-hidden', 'true')
    expect(frame.textContent).toContain('Asha')
    expect(within(frame).getAllByRole('heading', { level: 1, hidden: true })).toHaveLength(1)
  })
})
