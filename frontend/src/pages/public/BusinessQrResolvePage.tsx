import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { QrCode, ScanLine } from 'lucide-react'
import { publicBusinessApi } from '../../api/businessApi'
import { storefrontPath } from '../../lib/business'
import { getErrorMessage } from '../../api/client'
import { config } from '../../config'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Feedback'
import styles from './PublicBusinessPage.module.scss'

type Problem = { kind: 'disabled' | 'unknown' | 'error'; message: string }


/** /bq/:code — what a business QR code encodes. Resolves the code (recording the scan) and opens the storefront. */
export default function BusinessQrResolvePage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setProblem(null)
    publicBusinessApi
      .resolveQr(code)
      .then((r) => !cancelled && navigate(storefrontPath(r), { replace: true }))
      .catch((e) => {
        if (cancelled) return
        const status = axios.isAxiosError(e) ? e.response?.status : undefined
        if (status === 410) setProblem({ kind: 'disabled', message: getErrorMessage(e, 'This QR code has been turned off by the business.') })
        else if (status === 404) setProblem({ kind: 'unknown', message: getErrorMessage(e, 'We don’t recognise this QR code.') })
        else setProblem({ kind: 'error', message: getErrorMessage(e) })
      })
    return () => {
      cancelled = true
    }
  }, [code, navigate, attempt])

  if (!problem) {
    return (
      <div className={styles.center} aria-busy="true">
        <div className={styles.missing}>
          <Spinner size={36} label="Opening business profile" />
          <p>Opening business profile…</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.center}>
      <div className={styles.missing} role="alert">
        {problem.kind === 'disabled' ? <QrCode aria-hidden /> : <ScanLine aria-hidden />}
        <h1>{problem.kind === 'disabled' ? (/ended/i.test(problem.message) ? 'This campaign has ended' : 'QR code turned off') : problem.kind === 'unknown' ? 'QR not recognised' : 'Something went wrong'}</h1>
        <p>{problem.message}</p>
        {problem.kind === 'error' && (
          <Button variant="secondary" onClick={() => setAttempt((a) => a + 1)}>
            Try again
          </Button>
        )}
        <Button to="/" variant="outline">
          Go to {config.appName}
        </Button>
      </div>
    </div>
  )
}
