import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Supabase client for Client Components (Realtime subscriptions, direct
 * Storage uploads). Reads the same session cookies as the server client.
 * Page data is still loaded in Server Components.
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabasePublishableKey());
}
