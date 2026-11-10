import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import { getProfile } from "../features/authentication/authService";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = not checked yet
  const [profile, setProfile] = useState(null);
  const [loadedFor, setLoadedFor] = useState(undefined); // user id whose profile fetch has finished
  const [failedFor, setFailedFor] = useState(null); // user id whose profile could not be loaded (network, missing row)
  const [retryTick, setRetryTick] = useState(0);

  // 1) track the Supabase session (keep this callback synchronous: no awaits)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // 2) load the profile (role) whenever the signed-in user changes
  const userId = session === undefined ? undefined : session?.user?.id ?? null;
  useEffect(() => {
    if (userId === undefined) return;
    if (userId === null) {
      setProfile(null);
      setLoadedFor(null);
      return;
    }
    let cancelled = false;
    setLoadedFor(undefined); // a retry shows "loading" again instead of the old error
    setFailedFor(null);
    getProfile(userId)
      .then((p) => !cancelled && setProfile(p))
      .catch(() => {
        if (cancelled) return;
        setProfile(null);
        setFailedFor(userId);
      })
      .finally(() => !cancelled && setLoadedFor(userId));
    return () => {
      cancelled = true;
    };
  }, [userId, retryTick]);

  const retryProfile = useCallback(() => setRetryTick((t) => t + 1), []);

  const value = useMemo(() => {
    // "loading" stays true until the profile for the CURRENT user has been fetched,
    // so route guards never judge the role before it is known.
    const loading = userId === undefined || (userId !== null && loadedFor !== userId);
    const currentProfile = profile?.id === userId ? profile : null; // never show a previous user's profile
    return {
      user: session?.user ?? null,
      profile: currentProfile,
      isAdmin: currentProfile?.role === "admin",
      loading,
      // true when someone is signed in but their role could not be loaded (so we can say so instead of guessing)
      profileError: !loading && userId !== null && !currentProfile && failedFor === userId,
      retryProfile,
      setProfile,
    };
  }, [session, profile, loadedFor, failedFor, userId, retryProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
