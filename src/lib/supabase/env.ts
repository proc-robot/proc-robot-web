/**
 * The two public Supabase values the web app may hold (PLAN.md → Secrets):
 * the project URL and the publishable key. The secret / service-role key
 * never appears in this app. Both are inlined at build time.
 */
export function supabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set (see .env.example)");
  return value;
}

export function supabasePublishableKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!value) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set (see .env.example)");
  return value;
}
