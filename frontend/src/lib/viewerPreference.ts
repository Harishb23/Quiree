/**
 * Remembers which profile mode(s) a viewer chose, per public profile, in this browser only.
 * Local Storage is scoped to one browser on one device: a different browser or device starts fresh.
 */

const PREFIX = 'prolink.viewer.'

export interface ViewerPreference {
  modeIds: string[]
  savedAt: string
}

export const viewerPreference = {
  key: (slug: string) => `${PREFIX}${slug.toLowerCase()}`,

  load(slug: string): ViewerPreference | null {
    try {
      const raw = localStorage.getItem(this.key(slug))
      if (!raw) return null
      const parsed = JSON.parse(raw) as Partial<ViewerPreference>
      if (!Array.isArray(parsed.modeIds)) return null
      return { modeIds: parsed.modeIds.filter((id) => typeof id === 'string'), savedAt: parsed.savedAt ?? '' }
    } catch {
      return null
    }
  },

  save(slug: string, modeIds: string[]) {
    try {
      const value: ViewerPreference = { modeIds: [...new Set(modeIds)], savedAt: new Date().toISOString() }
      localStorage.setItem(this.key(slug), JSON.stringify(value))
    } catch {
      // Storage unavailable (private mode / blocked) - the viewer simply isn't remembered.
    }
  },

  clear(slug: string) {
    try {
      localStorage.removeItem(this.key(slug))
    } catch {
      /* ignore */
    }
  },
}

export interface ResolvedModes {
  /** Mode ids to display, in owner order. */
  modeIds: string[]
  source: 'saved' | 'default' | 'none'
}

/**
 * Decides which modes a viewer sees.
 * 1. Previously selected modes that are still published (in this browser).
 * 2. Otherwise the owner's current default mode (or first published mode).
 */
export function resolveViewerModes(
  availableModeIds: string[],
  defaultModeId: string | null,
  saved: ViewerPreference | null,
): ResolvedModes {
  if (availableModeIds.length === 0) return { modeIds: [], source: 'none' }

  if (saved) {
    const stillAvailable = availableModeIds.filter((id) => saved.modeIds.includes(id))
    if (stillAvailable.length > 0) return { modeIds: stillAvailable, source: 'saved' }
  }

  const fallback = defaultModeId && availableModeIds.includes(defaultModeId) ? defaultModeId : availableModeIds[0]!
  return { modeIds: [fallback], source: 'default' }
}
