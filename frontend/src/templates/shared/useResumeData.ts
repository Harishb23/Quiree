import { useMemo } from 'react'
import type { PublicMode, Skill, SocialPlatform } from '../../types/api'
import { formatDate, formatDateRange, formatMonth, formatYearRange, groupBy, toLines } from '../../lib/format'
import { displayUrl, mailHref, safeUrl, telHref } from '../../lib/url'
import { platformLabels } from '../../components/ui/BrandIcon'

export type ContactKind = 'email' | 'phone' | 'location' | 'website'

export interface ContactItem {
  kind: ContactKind
  value: string
  href?: string
}

export interface SafeSocialLink {
  platform: SocialPlatform
  label: string
  href: string
}

export interface DetailItem {
  label: string
  value: string
  href?: string
}

/** Derives viewer-ready, sanitised data from a public mode. Shared by every template. */
export function deriveResumeData(mode: PublicMode, permanentUrl: string) {
  const contact: ContactItem[] = []
  const c = mode.contact
  if (c.email) contact.push({ kind: 'email', value: c.email, href: mailHref(c.email) })
  if (c.phone) contact.push({ kind: 'phone', value: c.phone, href: telHref(c.phone) })
  if (c.location) contact.push({ kind: 'location', value: c.location })
  const website = safeUrl(c.website)
  if (website) contact.push({ kind: 'website', value: displayUrl(website), href: website })

  const socialLinks: SafeSocialLink[] = mode.socialLinks.flatMap((l) => {
    const href = safeUrl(l.url)
    return href ? [{ platform: l.platform, label: platformLabels[l.platform] ?? l.platform, href }] : []
  })

  const details: DetailItem[] = []
  if (mode.businessName) details.push({ label: 'Business', value: mode.businessName })
  if (mode.industry) details.push({ label: 'Industry', value: mode.industry })
  const companySite = safeUrl(mode.companyWebsite)
  if (companySite) details.push({ label: 'Company Website', value: displayUrl(companySite), href: companySite })
  const github = safeUrl(mode.gitHubUrl)
  if (github) details.push({ label: 'GitHub', value: displayUrl(github), href: github })

  const skillGroups = groupBy<Skill>(mode.skills, (s) => s.category, 'Core Skills')

  const experiences = mode.workExperiences.map((w) => ({
    ...w,
    dateRange: formatDateRange(w.startDate, w.endDate, w.isCurrent),
    bullets: toLines(w.responsibilities),
  }))

  const educations = mode.educations.map((e) => ({ ...e, years: formatYearRange(e.startYear, e.endYear) }))

  const projects = mode.projects.map((p) => ({
    ...p,
    href: safeUrl(p.url),
    tech: (p.techStack ?? '')
      .split(/[,|·]/)
      .map((t) => t.trim())
      .filter(Boolean),
  }))

  const achievements = mode.achievements.map((a) => ({ ...a, dateLabel: formatMonth(a.date) }))
  const certifications = mode.certifications.map((cert) => ({
    ...cert,
    dateLabel: formatDate(cert.issueDate),
    href: safeUrl(cert.credentialUrl),
  }))

  const headline = [mode.designation, mode.companyName].filter(Boolean).join(' · ')
  const profileUrl = safeUrl(permanentUrl)

  return {
    headline,
    summary: mode.summary?.trim() || null,
    businessDescription: mode.businessDescription?.trim() || null,
    contact,
    socialLinks,
    details,
    skillGroups,
    skillCount: mode.skills.length,
    experiences,
    educations,
    projects,
    achievements,
    certifications,
    services: mode.services,
    customSections: mode.customSections.filter((s) => s.title && s.content),
    profileUrl,
    profileUrlLabel: profileUrl ? displayUrl(profileUrl) : null,
  }
}

export type ResumeData = ReturnType<typeof deriveResumeData>

export function useResumeData(mode: PublicMode, permanentUrl: string): ResumeData {
  return useMemo(() => deriveResumeData(mode, permanentUrl), [mode, permanentUrl])
}
