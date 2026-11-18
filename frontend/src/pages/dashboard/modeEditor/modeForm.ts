import type { ModeDetail, ModeType, ModeUpsertRequest, PublicMode, Profile } from '../../../types/api'
import { modeTypes } from '../../../lib/modeTypes'
import { normalizeUrlInput, safeUrl } from '../../../lib/url'
import { normalizeSocialLinks } from '../../../components/forms/SocialLinksEditor'

export type ModeForm = ModeUpsertRequest

export function emptyModeForm(modeType: ModeType = 'General'): ModeForm {
  return {
    modeName: modeTypes[modeType].defaultName,
    modeType,
    designation: '',
    companyName: '',
    summary: '',
    contactEmail: '',
    contactPhone: '',
    location: '',
    website: '',
    businessName: '',
    industry: '',
    businessDescription: '',
    companyWebsite: '',
    gitHubUrl: '',
    isPublished: true,
    templateId: null,
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
}

export function formFromDetail(d: ModeDetail): ModeForm {
  const s = (v: string | null) => v ?? ''
  return {
    ...d,
    designation: s(d.designation),
    companyName: s(d.companyName),
    summary: s(d.summary),
    contactEmail: s(d.contactEmail),
    contactPhone: s(d.contactPhone),
    location: s(d.location),
    website: s(d.website),
    businessName: s(d.businessName),
    industry: s(d.industry),
    businessDescription: s(d.businessDescription),
    companyWebsite: s(d.companyWebsite),
    gitHubUrl: s(d.gitHubUrl),
    templateId: d.templateId,
  }
}

const blank = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null)
const url = (v: string | null | undefined) => (v && v.trim() ? normalizeUrlInput(v) : null)

/** Cleans the form into the API payload (trims, nulls empties, normalizes URLs). */
export function toPayload(f: ModeForm): ModeUpsertRequest {
  return {
    ...f,
    modeName: f.modeName.trim(),
    designation: blank(f.designation),
    companyName: blank(f.companyName),
    summary: blank(f.summary),
    contactEmail: blank(f.contactEmail),
    contactPhone: blank(f.contactPhone),
    location: blank(f.location),
    website: url(f.website),
    businessName: blank(f.businessName),
    industry: blank(f.industry),
    businessDescription: blank(f.businessDescription),
    companyWebsite: url(f.companyWebsite),
    gitHubUrl: url(f.gitHubUrl),
    skills: f.skills.filter((s) => s.name.trim()).map((s) => ({ ...s, name: s.name.trim(), category: blank(s.category) })),
    workExperiences: f.workExperiences.map((w) => ({
      ...w,
      title: w.title.trim(),
      company: w.company.trim(),
      location: blank(w.location),
      startDate: w.startDate || null,
      endDate: w.isCurrent ? null : w.endDate || null,
      description: blank(w.description),
      responsibilities: blank(w.responsibilities),
    })),
    educations: f.educations.map((e) => ({
      ...e,
      degree: e.degree.trim(),
      institution: e.institution.trim(),
      fieldOfStudy: blank(e.fieldOfStudy),
      grade: blank(e.grade),
      description: blank(e.description),
      startYear: e.startYear || null,
      endYear: e.endYear || null,
    })),
    projects: f.projects.map((p) => ({
      ...p,
      title: p.title.trim(),
      role: blank(p.role),
      description: blank(p.description),
      techStack: blank(p.techStack),
      outcome: blank(p.outcome),
      url: url(p.url),
    })),
    achievements: f.achievements.map((a) => ({ ...a, title: a.title.trim(), description: blank(a.description), date: a.date || null })),
    certifications: f.certifications.map((c) => ({
      ...c,
      name: c.name.trim(),
      issuer: blank(c.issuer),
      issueDate: c.issueDate || null,
      credentialUrl: url(c.credentialUrl),
    })),
    services: f.services.map((s) => ({ name: s.name.trim(), description: blank(s.description) })),
    customSections: f.customSections.map((c) => ({ title: c.title.trim(), content: c.content.trim() })),
    socialLinks: normalizeSocialLinks(f.socialLinks),
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Client-side validation mirroring the backend DTO rules. Keys are dotted paths. */
export function validateMode(p: ModeUpsertRequest): Record<string, string> {
  const e: Record<string, string> = {}
  if (p.modeName.length < 2 || p.modeName.length > 60) e.modeName = 'Mode name must be 2-60 characters.'
  if (p.contactEmail && !EMAIL.test(p.contactEmail)) e.contactEmail = 'Enter a valid email address.'
  if (p.contactPhone && !/^[+\d][\d\s()-]{6,}$/.test(p.contactPhone)) e.contactPhone = 'Enter a valid phone number.'
  for (const key of ['website', 'companyWebsite', 'gitHubUrl'] as const) {
    if (p[key] && !safeUrl(p[key])) e[key] = 'Enter a valid URL.'
  }
  p.workExperiences.forEach((w, i) => {
    if (!w.title) e[`workExperiences.${i}.title`] = 'Job title is required.'
    if (!w.company) e[`workExperiences.${i}.company`] = 'Company is required.'
    if (w.startDate && w.endDate && w.endDate < w.startDate) e[`workExperiences.${i}.endDate`] = 'End date is before start date.'
  })
  p.educations.forEach((ed, i) => {
    if (!ed.degree) e[`educations.${i}.degree`] = 'Degree is required.'
    if (!ed.institution) e[`educations.${i}.institution`] = 'Institution is required.'
    if (ed.startYear && ed.endYear && ed.endYear < ed.startYear) e[`educations.${i}.endYear`] = 'End year is before start year.'
  })
  p.projects.forEach((pr, i) => {
    if (!pr.title) e[`projects.${i}.title`] = 'Project title is required.'
    if (pr.url && !safeUrl(pr.url)) e[`projects.${i}.url`] = 'Enter a valid URL.'
  })
  p.achievements.forEach((a, i) => !a.title && (e[`achievements.${i}.title`] = 'Title is required.'))
  p.certifications.forEach((c, i) => {
    if (!c.name) e[`certifications.${i}.name`] = 'Certification name is required.'
    if (c.credentialUrl && !safeUrl(c.credentialUrl)) e[`certifications.${i}.credentialUrl`] = 'Enter a valid URL.'
  })
  p.services.forEach((s, i) => !s.name && (e[`services.${i}.name`] = 'Name is required.'))
  p.customSections.forEach((c, i) => {
    if (!c.title) e[`customSections.${i}.title`] = 'Title is required.'
    if (!c.content) e[`customSections.${i}.content`] = 'Content is required.'
  })
  p.socialLinks.forEach((l, i) => !safeUrl(l.url) && (e[`socialLinks.${i}`] = 'Enter a valid link.'))
  return e
}

/** Builds what a viewer would see from unsaved form state (used by the live preview). */
export function previewModeFromForm(p: ModeUpsertRequest, profile: Profile | undefined, templateKey: string): PublicMode {
  const links = [...p.socialLinks]
  for (const l of profile?.socialLinks ?? []) if (!links.some((x) => x.platform === l.platform)) links.push(l)
  return {
    ...p,
    id: 'preview',
    summary: p.summary ?? profile?.summary ?? null,
    templateKey,
    contact: {
      email: p.contactEmail ?? profile?.email ?? null,
      phone: p.contactPhone ?? profile?.mobile ?? null,
      location: p.location ?? profile?.location ?? null,
      website: p.website ?? profile?.website ?? null,
    },
    socialLinks: links,
  }
}
