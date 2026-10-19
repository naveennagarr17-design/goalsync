import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** False until the two values in .env.local are filled in. */
export const isConfigured = Boolean(url && key && !url.includes('YOUR-PROJECT') && !key.startsWith('YOUR-'));

// This is the PUBLIC key. Row Level Security in the database protects the data.
export const supabase = createClient(url ?? 'http://localhost:54321', key ?? 'not-configured', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Turns Supabase/network errors into sentences a person can act on. */
export function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : String(error);
  const lower = message.toLowerCase();
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network request failed')) {
    return 'Could not reach the server. Check your internet connection and try again.';
  }
  if (lower.includes('invalid login credentials')) return 'That email and password do not match.';
  if (lower.includes('email not confirmed')) return 'Please confirm your email first. Check your inbox for the link.';
  if (lower.includes('database error saving new user') || lower.includes('not on the goalsync member list')) {
    return 'This email is not on the member list. GoalSync is private, so only invited emails can sign up.';
  }
  if (lower.includes('user already registered')) return 'An account with this email already exists. Try logging in.';
  if (lower.includes('password should be at least')) return 'Choose a longer password (at least 8 characters).';
  if (lower.includes('rate limit') || lower.includes('too many')) return 'Too many attempts. Wait a few minutes and try again.';
  if (lower.includes('row-level security') || lower.includes('permission denied')) return 'You do not have permission to do that.';
  return message || 'Something went wrong. Please try again.';
}
