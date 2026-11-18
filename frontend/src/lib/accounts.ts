import type { AccountType, CurrentUser } from '../types/api'

/**
 * Personal accounts use profile modes; business accounts manage business profiles. Each has its own home and
 * its own part of the dashboard (the API enforces the same split).
 */
export const BUSINESS_AREA = '/dashboard/business'

export const homeFor = (type: AccountType | undefined) => (type === 'Business' ? BUSINESS_AREA : '/dashboard')

export const isBusinessPath = (path: string) => path === BUSINESS_AREA || path.startsWith(`${BUSINESS_AREA}/`)

/** True when the dashboard path belongs to the given account type's area. */
export const pathAllowed = (path: string, type: AccountType | undefined) =>
  type === 'Business' ? isBusinessPath(path) : !isBusinessPath(path)

/** Where to go after signing in: back to the page they wanted if it's in their area, otherwise their home. */
export function redirectAfterLogin(user: Pick<CurrentUser, 'accountType'>, from: string | undefined): string {
  return from && from.startsWith('/dashboard') && pathAllowed(from, user.accountType) ? from : homeFor(user.accountType)
}

/** Reads ?type=business from links like "/register?type=business" (marketing pages). */
export const accountTypeFromQuery = (search: string): AccountType =>
  new URLSearchParams(search).get('type')?.toLowerCase() === 'business' ? 'Business' : 'Personal'
