/**
 * auth-state.ts
 *
 * App-facing auth context: session, user, loading state, and signOut.
 *
 * Consumed by:
 *   - src/app/providers.tsx  (mounts the provider)
 *   - src/components/auth/ProtectedRoute.tsx  (reads session/isLoading)
 *   - Plan 02 shell logout action (calls signOut)
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

interface AuthState {
  /** Current Supabase session — null when signed out or still loading */
  session: Session | null;
  /** Current Supabase user object — derived from session */
  user: User | null;
  /** True while the initial session check is in flight; prevents flash of wrong route */
  isLoading: boolean;
  /** Convenience boolean — false during loading, true only when session is confirmed */
  isAuthenticated: boolean;
  /** Sign out the current user and invalidate the session */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore any persisted session on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    // Subscribe to future auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      // isLoading stays false after the first getSession() resolves
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // onAuthStateChange will set session to null on success
  }

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    isLoading,
    isAuthenticated: !isLoading && session !== null,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Consume auth state anywhere in the tree. Throws if used outside AuthProvider. */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
