import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '@/appwrite/auth'
import { useAuthStore } from '@/store/auth.store'
import { ROUTES } from '@/lib/constants'
import LoadingScreen from '@/components/ui/LoadingScreen'

/**
 * OAuth callback landing page — /auth/callback
 *
 * WHY THIS EXISTS
 * ───────────────
 * On iOS Safari, Appwrite's session cookie (a_session_<projectId>) is
 * a cross-site cookie. If the OAuth success URL points directly to
 * /dashboard, ProtectedRoute runs before the Appwrite SDK has had a
 * chance to read the cookie that was just set, so getCurrentUser()
 * returns null and the user is bounced back to /auth.
 *
 * By landing on /auth/callback first — a page that lives in the same
 * origin as the OAuth initiator — we give the browser one navigation
 * cycle to settle the cookie jar, then explicitly call getCurrentUser()
 * before redirecting to /dashboard. This works on all browsers including
 * iOS Safari with ITP enabled.
 *
 * FLOW
 * ────
 * Google → Appwrite → /auth/callback → verify session → /dashboard
 *                                    → on failure  → /auth?error=oauth_failed
 */
export default function AuthCallbackPage() {
  const navigate   = useNavigate()
  const { setUser, setLoading, setChecked } = useAuthStore()
  const attempted  = useRef(false)

  useEffect(() => {
    // Guard against React StrictMode double-invoke
    if (attempted.current) return
    attempted.current = true

    const verify = async () => {
      try {
        // Small delay lets the browser fully commit the session cookie
        // before we try to read it. 200ms is enough for all tested devices.
        await new Promise((resolve) => setTimeout(resolve, 200))

        const user = await getCurrentUser()

        if (user) {
          setUser(user)
          setLoading(false)
          setChecked(true)
          navigate(ROUTES.dashboard, { replace: true })
        } else {
          // Session was not established — go back to auth with error
          setUser(null)
          setLoading(false)
          setChecked(true)
          navigate(`${ROUTES.auth}?error=oauth_failed`, { replace: true })
        }
      } catch {
        setUser(null)
        setLoading(false)
        setChecked(true)
        navigate(`${ROUTES.auth}?error=oauth_failed`, { replace: true })
      }
    }

    verify()
  }, [navigate, setUser, setLoading, setChecked])

  // Show the branded loading screen while we verify
  return <LoadingScreen />
}
