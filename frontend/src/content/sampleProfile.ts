/**
 * DEMO CONTENT FOR MARKETING PAGES ONLY.
 * Used by the landing-page identity showcase and template carousel to illustrate the product.
 * This must never be used for real profiles — real profile data always comes from the backend API.
 */
import type { PublicMode } from '../types/api'

export const sampleOwner = {
  fullName: 'Arjun Mehra',
  photoUrl: null as string | null,
  permanentUrl: 'https://yourdomain.com/p/arjunmehra',
}

const contact = {
  email: 'arjun@example.com',
  phone: '+91 90000 00000',
  location: 'Chennai, India',
  website: null,
}

const base = {
  businessName: null,
  industry: null,
  businessDescription: null,
  companyWebsite: null,
  gitHubUrl: null,
  services: [],
  customSections: [],
}

export const sampleModes: PublicMode[] = [
  {
    ...base,
    id: 'demo-dev',
    modeName: 'Software Developer',
    modeType: 'Developer',
    designation: 'Senior Software Developer',
    companyName: 'Nimbus Labs',
    summary:
      'Full-stack developer with 6+ years of experience building scalable web and mobile applications using React, .NET and cloud technologies.',
    gitHubUrl: 'https://github.com/example',
    templateKey: 'modern-glass',
    contact,
    skills: [
      { name: 'TypeScript', category: 'Programming Languages' },
      { name: 'C#', category: 'Programming Languages' },
      { name: 'React', category: 'Frameworks' },
      { name: '.NET Core', category: 'Frameworks' },
      { name: 'SQL Server', category: 'Technical Skills' },
      { name: 'Docker', category: 'Technical Skills' },
      { name: 'AWS', category: 'Technical Skills' },
    ],
    workExperiences: [
      {
        title: 'Senior Software Developer',
        company: 'Nimbus Labs',
        location: 'Chennai',
        startDate: '2022-03-01',
        endDate: null,
        isCurrent: true,
        description: 'Leading the platform team for a B2B SaaS product.',
        responsibilities:
          'Led development of scalable web applications using React and .NET\nImplemented real-time features using SignalR\nMentored a team of 5 engineers',
      },
      {
        title: 'Software Engineer',
        company: 'BrightApps',
        location: 'Bengaluru',
        startDate: '2019-06-01',
        endDate: '2022-02-01',
        isCurrent: false,
        responsibilities: 'Built REST APIs for e-commerce clients\nImproved page load times by 40%',
      },
    ],
    educations: [
      {
        degree: 'B.E. Computer Science',
        institution: 'Anna University',
        startYear: 2015,
        endYear: 2019,
      },
    ],
    projects: [
      {
        title: 'Realtime Logistics Tracker',
        role: 'Tech Lead',
        description: 'Live fleet tracking dashboard with route optimisation.',
        techStack: 'React, SignalR, Azure',
        outcome: 'Reduced delivery delays by 22%',
      },
      {
        title: 'Open-source UI Kit',
        description: 'Accessible component library used by 3 internal products.',
        techStack: 'TypeScript, Storybook',
      },
    ],
    achievements: [{ title: 'Engineering Excellence Award 2024', description: 'Recognised for platform reliability.' }],
    certifications: [{ name: 'AWS Certified Developer – Associate', issuer: 'Amazon Web Services', issueDate: '2023-05-01' }],
    socialLinks: [
      { platform: 'LinkedIn', url: 'https://linkedin.com/in/example' },
      { platform: 'GitHub', url: 'https://github.com/example' },
    ],
  },
  {
    ...base,
    id: 'demo-hr',
    modeName: 'HR Manager',
    modeType: 'HR',
    designation: 'HR Manager',
    companyName: 'Nimbus Labs',
    summary:
      'People-first HR leader experienced in talent acquisition, employee relations and building high-performance cultures for growing teams.',
    templateKey: 'elegant-white',
    contact,
    skills: [
      { name: 'Recruitment', category: 'Expertise' },
      { name: 'Talent Acquisition', category: 'Expertise' },
      { name: 'Employee Relations', category: 'Expertise' },
      { name: 'HR Operations', category: 'Expertise' },
      { name: 'Payroll', category: 'Expertise' },
    ],
    workExperiences: [
      {
        title: 'HR Manager',
        company: 'Nimbus Labs',
        startDate: '2021-01-01',
        endDate: null,
        isCurrent: true,
        responsibilities: 'Scaled the team from 40 to 160 employees\nIntroduced structured onboarding and quarterly reviews',
      },
    ],
    educations: [{ degree: 'MBA – Human Resources', institution: 'Madras School of Management', startYear: 2016, endYear: 2018 }],
    projects: [
      {
        title: 'Campus Hiring Program',
        description: 'Designed a campus hiring pipeline across 12 colleges.',
        outcome: '85 graduates hired in one season',
      },
    ],
    achievements: [{ title: 'Reduced attrition by 30%', description: 'Through engagement and growth initiatives.' }],
    certifications: [{ name: 'SHRM Certified Professional', issuer: 'SHRM' }],
    socialLinks: [{ platform: 'LinkedIn', url: 'https://linkedin.com/in/example' }],
  },
  {
    ...base,
    id: 'demo-ent',
    modeName: 'Entrepreneur',
    modeType: 'Entrepreneur',
    designation: 'Founder',
    companyName: 'GreenCart',
    businessName: 'GreenCart',
    industry: 'Retail & Sustainability',
    businessDescription: 'A zero-waste grocery delivery brand serving 20,000+ households.',
    companyWebsite: 'https://example.com',
    summary: 'Founder building sustainable consumer brands. Passionate about operations, partnerships and growth.',
    templateKey: 'personal-branding',
    contact,
    skills: [
      { name: 'Business Strategy', category: 'Expertise' },
      { name: 'Fundraising', category: 'Expertise' },
      { name: 'Operations', category: 'Expertise' },
    ],
    services: [
      { name: 'Zero-waste grocery delivery', description: 'Weekly subscriptions in reusable packaging.' },
      { name: 'Corporate pantry', description: 'Sustainable pantry supplies for offices.' },
    ],
    workExperiences: [
      {
        title: 'Founder & CEO',
        company: 'GreenCart',
        startDate: '2020-08-01',
        endDate: null,
        isCurrent: true,
        responsibilities: 'Grew revenue to ₹4 Cr ARR\nBuilt a team of 35',
      },
    ],
    educations: [{ degree: 'B.Com', institution: 'Loyola College', startYear: 2012, endYear: 2015 }],
    projects: [],
    achievements: [{ title: 'Top 50 Startups – Startup India 2024' }],
    certifications: [],
    socialLinks: [{ platform: 'Instagram', url: 'https://instagram.com/example' }],
  },
  {
    ...base,
    id: 'demo-mkt',
    modeName: 'Digital Marketer',
    modeType: 'Marketing',
    designation: 'Digital Marketing Specialist',
    companyName: 'Freelance',
    summary: 'Performance marketer helping brands grow with SEO, paid ads and data-driven social campaigns.',
    templateKey: 'gradient-glass',
    contact,
    skills: [
      { name: 'SEO', category: 'Marketing' },
      { name: 'Google Ads', category: 'Marketing' },
      { name: 'Social Media Marketing', category: 'Marketing' },
      { name: 'Campaign Management', category: 'Marketing' },
    ],
    workExperiences: [
      {
        title: 'Digital Marketing Consultant',
        company: 'Freelance',
        startDate: '2021-04-01',
        endDate: null,
        isCurrent: true,
        responsibilities: 'Managed ₹50L+ monthly ad budgets\nRan campaigns for 15 D2C brands',
      },
    ],
    educations: [{ degree: 'PG Diploma in Digital Marketing', institution: 'MICA', startYear: 2019, endYear: 2020 }],
    projects: [
      {
        title: 'Festive Season Campaign',
        description: 'Multi-channel campaign for a fashion brand.',
        outcome: '4.2x ROAS and 38% revenue growth',
      },
    ],
    achievements: [{ title: 'Google Ads Search Certified' }],
    certifications: [{ name: 'Google Analytics Certification', issuer: 'Google' }],
    socialLinks: [{ platform: 'LinkedIn', url: 'https://linkedin.com/in/example' }],
  },
]
