// Marketing copy for the public website. Edit here rather than inside page components.

export const hero = {
  pill: 'One Identity. Many Roles.',
  titleStart: 'Your Professional',
  titleEnd: 'Identity, Reimagined',
  subtitle:
    'Create multiple professional profiles, share them with a single QR code, and let people view the right you, every time.',
}

export const aboutTeaser = {
  eyebrow: 'About Us',
  title: 'Built for people who wear more than one hat',
  body: [
    'Today’s professionals are developers by day, consultants on weekends and founders at heart. Paper cards and single-purpose profiles force you to pick one story.',
    'We built a platform where every role gets its own complete, resume-quality profile — and all of them live behind one permanent link and one QR code that never changes.',
  ],
}

export interface FeatureItem {
  icon:
    | 'layers'
    | 'qr'
    | 'contact'
    | 'smartphone'
    | 'palette'
    | 'memory'
    | 'shield'
    | 'lock'
  title: string
  description: string
}

export const features: FeatureItem[] = [
  {
    icon: 'layers',
    title: 'Multiple Profiles',
    description: 'Create independent professional identities — HR, Developer, Entrepreneur and more — under one account.',
  },
  {
    icon: 'qr',
    title: 'Single QR Code',
    description: 'One permanent QR code for all your profiles. Update anything; the code never changes.',
  },
  {
    icon: 'contact',
    title: 'Save Contact (vCard)',
    description: 'Viewers save your details instantly with a prefilled contact card, including your profile link.',
  },
  {
    icon: 'smartphone',
    title: 'Add to Home Screen',
    description: 'Viewers can keep your profile like an app on their phone, where the browser supports it.',
  },
  {
    icon: 'palette',
    title: '10 Premium Templates',
    description: 'Glassmorphism resume templates — pick a different look for every professional mode.',
  },
  {
    icon: 'memory',
    title: 'Viewer Mode Memory',
    description: 'Returning viewers see the mode they chose last time on the same browser and device.',
  },
  {
    icon: 'shield',
    title: 'Secure Payments',
    description: 'Razorpay checkout with server-side signature verification before any plan is activated.',
  },
  {
    icon: 'lock',
    title: 'Privacy Controls',
    description: 'Publish or hide each mode, or make your whole profile private with a single switch.',
  },
]

export const steps = [
  {
    title: 'Create Your Profile',
    description: 'Add your details and build one or more professional modes.',
  },
  {
    title: 'Choose a Template',
    description: 'Select from 10 premium glass resume templates for each mode.',
  },
  {
    title: 'Share Your QR',
    description: 'Use a single, permanent QR code to share all your profiles.',
  },
]

export const qrDemo = {
  eyebrow: 'Smart QR Sharing',
  title: 'One QR code. Forever.',
  body: 'Your QR code points to your permanent public profile URL. Change your default mode, switch templates or rewrite your experience — the printed code on your card, badge or banner keeps working.',
  points: [
    'Never regenerates when you edit your profile',
    'Works with any phone camera — no app needed',
    'Viewers can switch between your published modes',
    'Download as PNG or SVG for print',
  ],
}

export const viewerFlow = [
  { title: 'Scan', description: 'The viewer scans your permanent QR code with any camera.' },
  { title: 'Open', description: 'Your public profile opens instantly — no sign-up or login.' },
  { title: 'Choose', description: 'They see your default mode, or pick the modes that interest them.' },
  { title: 'Save', description: 'One tap saves your contact card or adds your profile to their home screen.' },
]

export const honestNotes = [
  'Viewer mode memory is stored in the viewer’s browser. It works on the same browser and device; a different phone or browser starts fresh.',
  'Add to Home Screen depends on the browser. Android browsers can show an install prompt; on iPhone, viewers use Safari’s Share → Add to Home Screen.',
  'Saving a contact opens a standard .vcf file. The viewer confirms the save in their contacts app.',
]

export const vision = {
  vision:
    'A world where every professional can present the right side of themselves to the right audience — instantly, beautifully and on their own terms.',
  mission:
    'To give individuals and businesses a single, permanent digital identity that adapts to every role they play, replacing outdated paper cards and fragmented profiles.',
}

export const values = [
  { title: 'Ownership', description: 'Your data, your modes, your rules. Publish only what you choose.' },
  { title: 'Permanence', description: 'Links and QR codes you share today keep working tomorrow.' },
  { title: 'Craft', description: 'Every template is designed to look like a complete, premium resume.' },
  { title: 'Trust', description: 'Secure authentication, verified payments and privacy by default.' },
]

// TODO(client): replace with real founder details (name, title, bio, photo).
export const founder = {
  name: 'Founder Name',
  title: 'Founder & CEO',
  bio: [
    'Our founder started this platform after years of juggling multiple professional roles and realising that no single card or profile could tell the whole story.',
    'The vision is simple: one identity, many roles — shared through a single QR code that never changes.',
  ],
  quote: 'Your professional identity should adapt to you — not the other way around.',
}

// TODO(client): replace with real company contact details.
export const company = {
  email: 'hello@yourdomain.com',
  phone: '+91 00000 00000',
  address: 'Your Office Address, City, India',
  hours: 'Mon – Fri, 10:00 AM – 6:00 PM IST',
}

export const pricingFaq = [
  {
    q: 'Is there a free plan?',
    a: 'Yes. The Free plan lets you create profile modes, use the essential templates and share your permanent QR code at no cost.',
  },
  {
    q: 'Will my QR code change if I upgrade or downgrade?',
    a: 'Never. Your QR code and public URL are permanent and independent of your plan.',
  },
  {
    q: 'How are payments processed?',
    a: 'Payments are handled by Razorpay. Your plan is activated only after our server verifies the payment signature.',
  },
  {
    q: 'What happens when my plan expires?',
    a: 'Your existing profiles stay online. You can keep using them, but creating extra modes or selecting premium templates requires an active plan.',
  },
  {
    q: 'Can I renew early?',
    a: 'Yes. Renewing while a plan is active adds the new period after your current expiry date, so you never lose days.',
  },
]

export const footerLinks = {
  product: [
    { label: 'Features', to: '/features' },
    { label: 'Pricing', to: '/pricing' },
    { label: 'Templates', to: '/#templates' },
    { label: 'How It Works', to: '/#how-it-works' },
  ],
  company: [
    { label: 'About Us', to: '/about' },
    { label: 'Vision & Mission', to: '/about#vision' },
    { label: 'Founder', to: '/about#founder' },
    { label: 'Contact', to: '/contact' },
  ],
}
