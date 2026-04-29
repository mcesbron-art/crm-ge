"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase pour les composants client.
 * À utiliser dans les Client Components ("use client").
 *
 * Ne stocke pas de secrets : utilise UNIQUEMENT la clé publishable (anon).
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
