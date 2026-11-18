import { Briefcase, Code2, Handshake, Megaphone, Rocket, Users, type LucideIcon } from 'lucide-react'
import type { ModeType } from '../types/api'

export interface ModeTypeMeta {
  label: string
  icon: LucideIcon
  /** Suggested skill categories shown in the editor for this professional role. */
  skillCategories: string[]
  defaultName: string
}

export const modeTypes: Record<ModeType, ModeTypeMeta> = {
  General: {
    label: 'General Professional',
    icon: Briefcase,
    skillCategories: ['Core Skills', 'Tools', 'Soft Skills'],
    defaultName: 'Professional',
  },
  Developer: {
    label: 'Software Developer',
    icon: Code2,
    skillCategories: ['Programming Languages', 'Frameworks', 'Technical Skills', 'Databases', 'Cloud & DevOps'],
    defaultName: 'Software Developer',
  },
  HR: {
    label: 'HR Professional',
    icon: Users,
    skillCategories: ['Recruitment', 'Talent Acquisition', 'Employee Relations', 'HR Operations', 'Payroll'],
    defaultName: 'HR Manager',
  },
  Entrepreneur: {
    label: 'Entrepreneur',
    icon: Rocket,
    skillCategories: ['Leadership', 'Business Strategy', 'Operations', 'Finance'],
    defaultName: 'Entrepreneur',
  },
  Marketing: {
    label: 'Digital Marketing',
    icon: Megaphone,
    skillCategories: ['SEO', 'Google Ads', 'Social Media Marketing', 'Campaign Management', 'Analytics'],
    defaultName: 'Digital Marketing Specialist',
  },
  Consultant: {
    label: 'Business Consultant',
    icon: Handshake,
    skillCategories: ['Consulting', 'Industry Expertise', 'Process Improvement', 'Tools'],
    defaultName: 'Business Consultant',
  },
}

export const modeTypeOptions = (Object.keys(modeTypes) as ModeType[]).map((value) => ({
  value,
  label: modeTypes[value].label,
}))
