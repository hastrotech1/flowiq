import { OAuthProvider, AppwriteException } from 'appwrite'
import { account } from './client'
import type { AppUser } from '@/types'

// ── Cookie strategy ────────────────────────────────────────
// Appwrite JS SDK v13+ automatically stores the session in an
// httpOnly cookie when the server sets it via the OAuth callback.
// We do NOT touch localStorage for auth at any point.
// The session cookie is: a_session_<projectId>
// ──────────────────────────────────────────────────────────

/**
 * Kicks off Google OAuth flow via Appwrite.
 * Redirects the browser to Google → Appwrite callback → app.
 *
 * @param successUrl - Where Appwrite redirects after successful auth
 * @param failureUrl - Where Appwrite redirects on auth failure
 */
export async function signInWithGoogle(
  successUrl = `${window.location.origin}/auth/callback`,
  failureUrl = `${window.location.origin}/auth?error=oauth_failed`,
): Promise<void> {
  // createOAuth2Session triggers the full redirect flow.
  // Success URL points to /auth/callback (not /dashboard directly)
  // so the app can verify the session before navigating to the app.
  // This ensures the Appwrite session cookie is set and readable
  // before ProtectedRoute checks for a user — fixes iOS Safari ITP.
  account.createOAuth2Session(
    OAuthProvider.Google,
    successUrl,
    failureUrl,
  )
}

/**
 * Fetches the currently authenticated user from Appwrite.
 * Returns null if no active session exists (not logged in).
 * Safe to call on every app load — use inside useAuth hook.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  try {
    const user = await account.get()
    return {
      id:     user.$id,
      email:  user.email,
      name:   user.name,
      // Appwrite doesn't expose Google avatar directly —
      // prefs can store it after first login if needed
      avatar: user.prefs?.avatar ?? null,
    }
  } catch (err) {
    // AppwriteException with code 401 = no session, expected case
    if (err instanceof AppwriteException && err.code === 401) {
      return null
    }
    // Anything else is a real network/config error
    throw err
  }
}

/**
 * Signs out the current user by deleting the active session.
 * Appwrite clears the session cookie on the server side.
 * After this, getCurrentUser() will return null.
 */
export async function signOut(): Promise<void> {
  // 'current' is the Appwrite keyword for the active session
  await account.deleteSession('current')
}

/**
 * Returns true if there is an active authenticated session.
 * Lightweight check — delegates to getCurrentUser().
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null
}
