/**
 * public-env.ts
 *
 * Single bootstrap point for all browser-visible environment variables.
 * Fails fast with a developer-friendly error when required vars are absent
 * so misconfigured local setups surface immediately instead of silently
 * producing broken auth calls.
 *
 * Usage: import { publicEnv } from "@/lib/config/public-env"
 */

function requireEnv(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value) {
    throw new Error(
      `[PlanPlate] Missing required environment variable: ${key}\n` +
        `Copy .env.example to .env.local and fill in the value.`
    );
  }
  return value;
}

export const publicEnv = {
  /** Supabase project URL — e.g. http://127.0.0.1:54331 for local dev */
  VITE_SUPABASE_URL: requireEnv("VITE_SUPABASE_URL"),
  /** Supabase publishable/anon key — safe to expose in the browser */
  VITE_SUPABASE_ANON_KEY: requireEnv("VITE_SUPABASE_ANON_KEY"),
} as const;
