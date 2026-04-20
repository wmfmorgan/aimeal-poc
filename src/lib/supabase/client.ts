/**
 * client.ts
 *
 * Browser Supabase client — single creation point for the entire frontend.
 * Do NOT call createClient() elsewhere in the app; import `supabase` from here.
 *
 * Configured for browser auth with:
 *   - persistSession: true — session survives browser restarts via localStorage
 *   - autoRefreshToken: true — Supabase handles silent token refresh before expiry
 *   - detectSessionInUrl: true — completes OAuth / email-confirmation / password-reset
 *     flows that return a token fragment in the URL hash
 */

import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/config/public-env";

export const supabase = createClient(
  publicEnv.VITE_SUPABASE_URL,
  publicEnv.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
