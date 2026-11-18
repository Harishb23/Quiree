import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileCard } from './ProfileCard'
import { cardThemes, getCardTheme } from './cardThemes'
import { templates } from '../templates'
import { makeMode } from '../test/fixtures'

const fullMode = makeMode({
  id: 'm1',
  modeName: 'Software Developer',
  modeType: 'Developer',
  designation: 'Full Stack Developer',
  companyName: 'TechNova Systems',
  summary: 'Builds scalable web applications.',
  skills: [
    { name: 'React', category: 'Frameworks' },
    { name: 'SQL Server', category: 'Data' },
  ],
  workExperiences: [{ title: 'Senior Developer', company: 'TechNova', startDate: '2019-01-01', isCurrent: true, responsibilities: 'Led platform team' }],
  projects: [{ title: 'Employee Management System', outcome: 'Used by 5k staff', url: 'https://example.com' }],
  services: [{ name: 'IT Consulting' }],
  achievements: [{ title: 'Increased brand reach by 300%' }],
  educations: [{ degree: 'MBA', institution: 'IIM' }],
  certifications: [{ name: 'Azure Developer', issuer: 'Microsoft' }],
  socialLinks: [
    { platform: 'LinkedIn', url: 'https://linkedin.com/in/h' },
    { platform: 'Instagram', url: 'javascript:alert(1)' },
  ],
})

describe('profile card designs', () => {
  it('defines 10 designs that match the 10 template keys', () => {
    expect(cardThemes).toHaveLength(10)
    expect(new Set(cardThemes.map((t) => t.key))).toEqual(new Set(templates.map((t) => t.key)))
    expect(getCardTheme('unknown').key).toBe('modern-glass')
  })

  it.each(cardThemes.map((t) => [t.name, t.key]))('%s renders the complete profile', (_name, key) => {
    render(<ProfileCard fullName="Harish Kumar" photoUrl={null} permanentUrl="https://prolink.example/p/harish" mode={fullMode} templateKey={key} />)
    const card = screen.getByRole('article')
    expect(card).toHaveAttribute('data-card', key)
    const c = within(card)
    expect(c.getByRole('heading', { level: 1, name: 'Harish Kumar' })).toBeInTheDocument()
    expect(c.getByText('Full Stack Developer')).toBeInTheDocument()
    expect(c.getAllByText(/TechNova Systems/).length).toBeGreaterThan(0)
    expect(c.getByText('Builds scalable web applications.')).toBeInTheDocument()
    expect(c.getAllByText('React').length).toBeGreaterThan(0)
    expect(c.getByText(/Senior Developer – TechNova/)).toBeInTheDocument()
    expect(c.getByText('Employee Management System')).toBeInTheDocument()
    expect(c.getAllByText('IT Consulting').length).toBeGreaterThan(0)
    expect(c.getByText(/Increased brand reach by 300%/)).toBeInTheDocument()
    expect(c.getByText('Azure Developer')).toBeInTheDocument()
    expect(c.getByRole('link', { name: /save contact/i })).toBeInTheDocument()
    // Unsafe links are never rendered
    expect(card.querySelector('a[href^="javascript:"]')).toBeNull()
  })

  it('quick actions link to call, email, WhatsApp and LinkedIn', () => {
    render(<ProfileCard fullName="H" photoUrl={null} permanentUrl="https://x/p/h" mode={fullMode} templateKey="modern-glass" />)
    const nav = screen.getByRole('navigation', { name: /quick contact/i })
    expect(within(nav).getByLabelText('Call')).toHaveAttribute('href', 'tel:+919876543210')
    expect(within(nav).getByLabelText('Email')).toHaveAttribute('href', 'mailto:owner@example.com')
    expect(within(nav).getByLabelText('WhatsApp')).toHaveAttribute('href', 'https://wa.me/919876543210')
    expect(within(nav).getByLabelText('LinkedIn')).toHaveAttribute('href', 'https://linkedin.com/in/h')
  })

  it('wires the action bar callbacks', async () => {
    const onShare = vi.fn()
    const onInstall = vi.fn()
    const onSaveContact = vi.fn()
    render(
      <ProfileCard
        fullName="H"
        photoUrl={null}
        permanentUrl="https://x/p/h"
        mode={fullMode}
        vcardHref="/api/public/h/vcard?modeId=m1"
        onShare={onShare}
        onInstall={onInstall}
        onSaveContact={onSaveContact}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /^share$/i }))
    await userEvent.click(screen.getByRole('button', { name: /add to home/i }))
    await userEvent.click(screen.getByRole('link', { name: /save contact/i }))
    expect(onShare).toHaveBeenCalled()
    expect(onInstall).toHaveBeenCalled()
    expect(onSaveContact).toHaveBeenCalled()
  })

  it('omits empty sections', () => {
    render(<ProfileCard fullName="Solo" photoUrl={null} permanentUrl="https://x/p/s" mode={makeMode({ id: 'e', modeName: 'Empty', skills: [], summary: null })} />)
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
  })
})
