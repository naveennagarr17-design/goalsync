import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { friendlyError, supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

type ProfilePatch = Partial<Pick<Profile, 'display_name' | 'theme_mode' | 'accent_color'>>;

interface AuthValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True until we know whether someone is signed in (and, if so, who they are). */
  loading: boolean;
  /** Set when a signed-in account has no member profile (not on the allow-list). */
  profileError: string | null;
  /** True after the user opened a password-reset link from their email. */
  passwordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** The website's own address, used in the links Supabase puts inside emails. */
export function appUrl(path = ''): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}${path}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const user = session?.user ?? null;
  const userId = user?.id ?? null;

  // 1. Keep the session in sync. (Only set state in this callback.)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setSessionReady(true);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setPasswordRecovery(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // 2. Load the member profile whenever the signed-in person changes.
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileError(null);
      return;
    }
    let cancelled = false;
    setProfile(null);
    setProfileError(null);
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setProfileError(friendlyError(error));
        else if (!data) setProfileError('This account is not an authorized GoalSync member.');
        else setProfile(data as Profile);
      });
    return () => { cancelled = true; };
  }, [userId]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(friendlyError(error));
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: displayName.trim() }, emailRedirectTo: appUrl() },
    });
    if (error) throw new Error(friendlyError(error));
    return { needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: appUrl('reset-password') });
    if (error) throw new Error(friendlyError(error));
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(friendlyError(error));
    setPasswordRecovery(false);
  }, []);

  const updateProfile = useCallback(async (patch: ProfilePatch) => {
    if (!userId) return;
    const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select().single();
    if (error) throw new Error(friendlyError(error));
    setProfile(data as Profile);
  }, [userId]);

  const loading = !sessionReady || (!!userId && !profile && !profileError);

  const value = useMemo<AuthValue>(
    () => ({ session, user, profile, loading, profileError, passwordRecovery, signIn, signUp, signOut, sendPasswordReset, updatePassword, updateProfile }),
    [session, user, profile, loading, profileError, passwordRecovery, signIn, signUp, signOut, sendPasswordReset, updatePassword, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
