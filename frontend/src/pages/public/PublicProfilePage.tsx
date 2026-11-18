import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Download, Share2, Smartphone, UserX } from 'lucide-react'
import { publicApi } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { config } from '../../config'
import { resolveViewerModes, viewerPreference } from '../../lib/viewerPreference'
import { useInstallPrompt, usePublicProfilePwa } from '../../lib/pwa'
import { shareLink } from '../../lib/share'
import { Button } from '../../components/ui/Button'
import { ErrorState, PageLoader } from '../../components/ui/Feedback'
import { InstallHelpModal } from '../../components/pwa/InstallHelpModal'
import { useToast } from '../../components/ui/Toast'
import { TemplateRenderer } from '../../templates'
import { ProfileCard } from '../../cards/ProfileCard'
import { getCardTheme } from '../../cards/cardThemes'
import { ContactSavedScreen, ModeChooserScreen } from '../../cards/ViewerScreens'
import type { PublicMode, PublicProfile } from '../../types/api'
import styles from './PublicProfilePage.module.scss'

type LoadState =
  | { status: 'loading' }
  | { status: 'notFound' }
  | { status: 'error'; message: string }
  | { status: 'ready'; profile: PublicProfile }

export default function PublicProfilePage() {
  const { slug = '' } = useParams()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    publicApi
      .get(slug)
      .then((profile) => !cancelled && setState({ status: 'ready', profile }))
      .catch((e) => {
        if (cancelled) return
        if (axios.isAxiosError(e) && e.response?.status === 404) setState({ status: 'notFound' })
        else setState({ status: 'error', message: getErrorMessage(e) })
      })
    return () => {
      cancelled = true
    }
  }, [slug, reloadKey])

  if (state.status === 'loading')
    return (
      <div className={styles.page}>
        <PageLoader label="Opening profile…" />
      </div>
    )
  if (state.status === 'notFound')
    return <ProfileUnavailable title="Profile not found" text="This profile doesn’t exist or has been made private by its owner." />
  if (state.status === 'error')
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <ErrorState message={state.message} onRetry={() => setReloadKey((k) => k + 1)} />
        </div>
      </div>
    )
  if (state.profile.modes.length === 0)
    return <ProfileUnavailable title={state.profile.fullName} text="This profile hasn’t been published yet. Please check back soon." />

  return <ProfileViewer profile={state.profile} />
}

type Screen = 'choose' | 'profile' | 'saved' | 'resume'

/**
 * Scan flow: (1) QR opens the permanent URL → (2) choose a profile mode → (3) profile card → (4) contact saved.
 * Step 2 is shown only when the owner has more than one published mode and allows viewers to choose.
 * Returning viewers on the same browser skip step 2 and land on the mode(s) they picked before.
 */
export function ProfileViewer({ profile }: { profile: PublicProfile }) {
  const toast = useToast()
  const available = useMemo(() => profile.modes.map((m) => m.id), [profile.modes])
  const canChoose = profile.allowViewerModeSelection && profile.modes.length > 1

  const [initial] = useState(() =>
    resolveViewerModes(available, profile.defaultModeId, canChoose ? viewerPreference.load(profile.slug) : null),
  )
  const [selection, setSelection] = useState<string[]>(initial.modeIds)
  const [activeId, setActiveId] = useState(initial.modeIds[0]!)
  const [screen, setScreen] = useState<Screen>(canChoose && initial.source !== 'saved' ? 'choose' : 'profile')
  const [installHelp, setInstallHelp] = useState(false)
  const { support, promptInstall } = useInstallPrompt()

  const visibleModes = profile.modes.filter((m) => selection.includes(m.id))
  const mode: PublicMode = profile.modes.find((m) => m.id === activeId) ?? visibleModes[0] ?? profile.modes[0]!
  const vcardHref = publicApi.vcardUrl(profile.slug, mode.id)
  const dark = getCardTheme(mode.templateKey).dark

  usePublicProfilePwa(publicApi.manifestUrl(profile.slug), profile.fullName.split(' ')[0] ?? profile.fullName)

  useEffect(() => {
    const previous = document.title
    document.title = `${profile.fullName} – ${mode.designation ?? mode.modeName} | ${config.appName}`
    return () => {
      document.title = previous
    }
  }, [profile.fullName, mode.designation, mode.modeName])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [screen, activeId])

  /** An explicit viewer choice is remembered in this browser (Local Storage). */
  function choose(modeIds: string[]) {
    const ordered = available.filter((id) => modeIds.includes(id))
    if (!ordered.length) return
    viewerPreference.save(profile.slug, ordered)
    setSelection(ordered)
    setActiveId(ordered.includes(activeId) ? activeId : ordered[0]!)
    setScreen('profile')
  }

  async function onShare() {
    const result = await shareLink(profile.permanentUrl, `${profile.fullName} – ${mode.designation ?? mode.modeName}`)
    if (result === 'copied') toast.success('Profile link copied to clipboard.')
  }

  async function onInstall() {
    if (support === 'prompt') {
      const outcome = await promptInstall()
      if (outcome === 'accepted') toast.success('Added to your home screen.')
      return
    }
    setInstallHelp(true)
  }

  const installModal = <InstallHelpModal open={installHelp} onClose={() => setInstallHelp(false)} link={profile.permanentUrl} />

  if (screen === 'choose') {
    return (
      <ModeChooserScreen
        profile={profile}
        initial={selection}
        allowMultiple={profile.allowViewerModeSelection}
        onConfirm={choose}
        onCancel={initial.source === 'saved' || selection !== initial.modeIds ? () => setScreen('profile') : undefined}
      />
    )
  }

  if (screen === 'saved') {
    return (
      <>
        <ContactSavedScreen
          profile={profile}
          mode={mode}
          vcardHref={vcardHref}
          canInstall={support !== 'installed'}
          onInstall={onInstall}
          onShare={onShare}
          onBack={() => setScreen('profile')}
        />
        {installModal}
      </>
    )
  }

  if (screen === 'resume') {
    return (
      <div className={styles.viewer}>
        <header className={styles.bar}>
          <button type="button" className={styles.backBtn} onClick={() => setScreen('profile')}>
            <ArrowLeft /> Back to card
          </button>
        </header>
        <TemplateRenderer
          templateKey={mode.templateKey}
          fullName={profile.fullName}
          photoUrl={profile.photoUrl}
          permanentUrl={profile.permanentUrl}
          mode={mode}
          actions={
            <>
              <Button href={vcardHref} download icon={<Download />} onClick={() => setScreen('saved')}>
                Save Contact
              </Button>
              <Button variant={dark ? 'secondary' : 'light'} icon={<Share2 />} onClick={onShare}>
                Share
              </Button>
              {support !== 'installed' && (
                <Button variant={dark ? 'secondary' : 'light'} icon={<Smartphone />} onClick={onInstall}>
                  Add to Home Screen
                </Button>
              )}
            </>
          }
        />
        {installModal}
      </div>
    )
  }

  return (
    <div className={[styles.stage, dark && styles.stageDark].filter(Boolean).join(' ')}>
      {visibleModes.length > 1 && (
        <div className={styles.tabs} role="tablist" aria-label="Selected modes">
          {visibleModes.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={m.id === mode.id}
              className={[styles.tab, m.id === mode.id && styles.tabActive].filter(Boolean).join(' ')}
              onClick={() => setActiveId(m.id)}
            >
              {m.modeName}
            </button>
          ))}
        </div>
      )}

      <ProfileCard
        fullName={profile.fullName}
        photoUrl={profile.photoUrl}
        permanentUrl={profile.permanentUrl}
        mode={mode}
        onChangeMode={canChoose ? () => setScreen('choose') : undefined}
        onShare={onShare}
        vcardHref={vcardHref}
        onSaveContact={() => setScreen('saved')}
        onInstall={onInstall}
        showInstall={support !== 'installed'}
        onViewResume={() => setScreen('resume')}
      />

      <footer className={styles.footer}>
        <span>
          Powered by <Link to="/">{config.appName}</Link>
        </span>
        <Link to="/register">Create your own profile →</Link>
      </footer>
      {installModal}
    </div>
  )
}

function ProfileUnavailable({ title, text }: { title: string; text: string }) {
  return (
    <div className={`${styles.page} app-dark-bg`}>
      <div className={styles.center}>
        <div className={styles.unavailable}>
          <UserX />
          <h1>{title}</h1>
          <p>{text}</p>
          <Button to="/" variant="secondary">
            Go to {config.appName}
          </Button>
        </div>
      </div>
    </div>
  )
}
