import {
  Atom,
  BarChart3,
  Briefcase,
  Cloud,
  Code2,
  Cog,
  Database,
  FileText,
  GraduationCap,
  Lightbulb,
  Megaphone,
  MessagesSquare,
  MousePointerClick,
  Network,
  PenTool,
  Search,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'

const rules: [RegExp, LucideIcon][] = [
  [/react|angular|vue|next/i, Atom],
  [/sql|database|mongo|postgres|mysql|data\b/i, Database],
  [/azure|aws|cloud|gcp|docker|kubernetes|devops/i, Cloud],
  [/\bseo\b|search/i, Search],
  [/\bsem\b|ads|ppc|google ads/i, MousePointerClick],
  [/social|marketing|brand|campaign|pr\b/i, Megaphone],
  [/analytic|report|insight|metric/i, BarChart3],
  [/design|figma|ui|ux|adobe|sketch/i, PenTool],
  [/hr|recruit|talent|hiring|people|employee|payroll/i, Users],
  [/automation|process|operation/i, Cog],
  [/integration|system|network|api/i, Network],
  [/strategy|innovation|product/i, Lightbulb],
  [/coach|training|mentor|teach|skill development/i, GraduationCap],
  [/resume|document|content|writing/i, FileText],
  [/interview|communication|counsel/i, MessagesSquare],
  [/consult|advis|business|management|leader/i, Briefcase],
  [/\.net|c#|java|python|typescript|javascript|code|develop|program/i, Code2],
]

/** Picks an icon from the skill/service name, then its category, else a neutral sparkle. */
export function iconFor(name: string, category?: string | null): LucideIcon {
  const match = (text: string) => rules.find(([re]) => re.test(text))?.[1]
  return match(name) ?? (category ? match(category) : undefined) ?? Sparkles
}
