import type { PublicMode, PublicProfile } from '../types/api'

export function makeMode(overrides: Partial<PublicMode> & Pick<PublicMode, 'id' | 'modeName'>): PublicMode {
  return {
    modeType: 'General',
    designation: `${overrides.modeName} Designation`,
    companyName: 'Acme Corp',
    summary: `Summary for ${overrides.modeName}`,
    businessName: null,
    industry: null,
    businessDescription: null,
    companyWebsite: null,
    gitHubUrl: null,
    templateKey: 'modern-glass',
    contact: { email: 'owner@example.com', phone: '+91 98765 43210', location: 'Chennai, India', website: null },
    skills: [{ name: `${overrides.modeName} Skill`, category: 'Core' }],
    workExperiences: [],
    educations: [],
    projects: [],
    achievements: [],
    certifications: [],
    services: [],
    customSections: [],
    socialLinks: [],
    ...overrides,
  }
}

export function makeProfile(overrides: Partial<PublicProfile> = {}): PublicProfile {
  return {
    slug: 'harish',
    permanentUrl: 'https://prolink.example/p/harish',
    fullName: 'Harish Baskar',
    photoUrl: null,
    allowViewerModeSelection: true,
    defaultModeId: 'hr',
    modes: [
      makeMode({ id: 'hr', modeName: 'HR Manager', modeType: 'HR' }),
      makeMode({ id: 'dev', modeName: 'Software Developer', modeType: 'Developer' }),
      makeMode({ id: 'ent', modeName: 'Entrepreneur', modeType: 'Entrepreneur' }),
    ],
    ...overrides,
  }
}
