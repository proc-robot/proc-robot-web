/**
 * Google sign-in (A1) is built but switched off until Phase 4 (TASKS_SECONDARY.md T4.2):
 * the email magic link is the only sign-in for now. To turn it on, set
 * GOOGLE_SIGN_IN="true" and enable the Google provider in Supabase
 * (`[auth.external.google]` in supabase/config.toml locally, Auth → Providers
 * on the hosted project).
 *
 * Server-side only: read at request time, so the same build works with the flag
 * on or off, and the browser never decides on its own.
 */
export function googleSignInEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.GOOGLE_SIGN_IN === "true";
}
