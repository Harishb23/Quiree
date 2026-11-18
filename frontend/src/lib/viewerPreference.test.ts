import { beforeEach, describe, expect, it } from 'vitest'
import { resolveViewerModes, viewerPreference } from './viewerPreference'

describe('viewerPreference storage', () => {
  beforeEach(() => localStorage.clear())

  it('saves and loads per profile slug', () => {
    viewerPreference.save('Harish', ['hr', 'hr', 'dev'])
    expect(viewerPreference.load('harish')?.modeIds).toEqual(['hr', 'dev'])
    expect(viewerPreference.load('someone-else')).toBeNull()
  })

  it('ignores corrupted storage values', () => {
    localStorage.setItem(viewerPreference.key('harish'), '{not json')
    expect(viewerPreference.load('harish')).toBeNull()
    localStorage.setItem(viewerPreference.key('harish'), JSON.stringify({ modeIds: 'oops' }))
    expect(viewerPreference.load('harish')).toBeNull()
  })
})

describe('resolveViewerModes', () => {
  const saved = (modeIds: string[]) => ({ modeIds, savedAt: '2026-01-01' })

  it('new viewers see the owner default mode', () => {
    expect(resolveViewerModes(['hr', 'dev', 'ent'], 'dev', null)).toEqual({ modeIds: ['dev'], source: 'default' })
  })

  it('remembers a previously selected mode even after the owner changes the default (Day 1 → Day 20)', () => {
    // Day 1: default was HR and the viewer picked HR. Day 20: default is now Entrepreneur.
    expect(resolveViewerModes(['hr', 'dev', 'ent'], 'ent', saved(['hr']))).toEqual({ modeIds: ['hr'], source: 'saved' })
  })

  it('keeps only still-published modes from a multi-mode choice', () => {
    expect(resolveViewerModes(['hr', 'ent'], 'ent', saved(['dev', 'hr']))).toEqual({ modeIds: ['hr'], source: 'saved' })
  })

  it('falls back to the current default when the saved mode was unpublished or deleted', () => {
    expect(resolveViewerModes(['dev', 'ent'], 'ent', saved(['hr']))).toEqual({ modeIds: ['ent'], source: 'default' })
  })

  it('falls back to the first mode when the default is unavailable', () => {
    expect(resolveViewerModes(['dev', 'ent'], 'gone', null)).toEqual({ modeIds: ['dev'], source: 'default' })
  })

  it('returns nothing when no modes are published', () => {
    expect(resolveViewerModes([], 'x', saved(['x']))).toEqual({ modeIds: [], source: 'none' })
  })
})
