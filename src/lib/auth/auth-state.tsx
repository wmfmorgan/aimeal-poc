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
  /** True when a PASSWORD_RECOVERY event arrived — signals the reset-complete flow */
  isPasswordRecovery: boolean;
  /** Sign out the current user and invalidate the session */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function hydrateSession() {
      const { data } = await supabase.auth.getSession();
      const storedSession = data.session;

      if (!isActive) return;

      if (!storedSession) {
        setSession(null);
        setIsLoading(false);
        return;
      }

      // Revalidate the persisted session before unlocking protected routes.
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!isActive) return;

      if (error || !user) {
        setSession(null);
        setIsLoading(false);
        await supabase.auth.signOut();
        return;
      }

      const { data: refreshed } = await supabase.auth.getSession();
      if (!isActive) return;

      setSession(refreshed.session);
      setIsLoading(false);
    }

    void hydrateSession();

    // Subscribe to future auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setIsLoading(false);
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      } else if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        setIsPasswordRecovery(false);
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
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
    isPasswordRecovery,
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
