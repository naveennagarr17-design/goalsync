import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { ACCENTS, isAccentKey } from '../lib/themes';
import type { AccentKey, ThemeMode } from '../lib/types';

const CACHE_KEY = 'goalsync.appearance';

/** Remembers the last look on this device so the login page and first paint match. The database is the real source. */
function readCache(): { mode: ThemeMode; accent: AccentKey } {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as { mode?: string; accent?: string };
    return {
      mode: raw.mode === 'dark' || raw.mode === 'system' ? raw.mode : 'light',
      accent: isAccentKey(raw.accent) ? raw.accent : 'forest',
    };
  } catch {
    return { mode: 'light', accent: 'forest' };
  }
}

interface ThemeValue {
  mode: ThemeMode;
  accent: AccentKey;
  /** What is actually shown right now ("system" resolved to light or dark). */
  resolved: 'light' | 'dark';
  accentColor: string;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentKey) => void;
  cycleMode: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);
const ORDER: ThemeMode[] = ['light', 'dark', 'system'];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { profile, updateProfile } = useAuth();
  const toast = useToast();
  const cached = useMemo(readCache, []);
  const [mode, setModeState] = useState<ThemeMode>(cached.mode);
  const [accent, setAccentState] = useState<AccentKey>(cached.accent);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  // When a member signs in, use THEIR saved settings.
  useEffect(() => {
    if (profile) {
      setModeState(profile.theme_mode);
      setAccentState(profile.accent_color);
    }
  }, [profile]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolved: 'light' | 'dark' = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
  const shade = ACCENTS[accent][resolved];

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.mode = resolved;
    root.style.colorScheme = resolved;
    root.style.setProperty('--accent', shade.accent);
    root.style.setProperty('--accent-strong', shade.strong);
    root.style.setProperty('--accent-soft', shade.soft);
    root.style.setProperty('--on-accent', shade.on);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0e1411' : '#f4faf6');
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ mode, accent })); } catch { /* storage may be blocked; that is fine */ }
  }, [resolved, shade, mode, accent]);

  const save = useCallback(async (patch: { theme_mode?: ThemeMode; accent_color?: AccentKey }) => {
    if (!profile) return; // signed out: only the local look changes
    try {
      await updateProfile(patch);
    } catch (e) {
      setModeState(profile.theme_mode);
      setAccentState(profile.accent_color);
      toast.show(`Could not save your appearance: ${(e as Error).message}`, 'error');
    }
  }, [profile, updateProfile, toast]);

  const setMode = useCallback((next: ThemeMode) => { setModeState(next); void save({ theme_mode: next }); }, [save]);
  const setAccent = useCallback((next: AccentKey) => { setAccentState(next); void save({ accent_color: next }); }, [save]);
  const cycleMode = useCallback(() => setMode(ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]), [mode, setMode]);

  const value = useMemo(
    () => ({ mode, accent, resolved, accentColor: shade.accent, setMode, setAccent, cycleMode }),
    [mode, accent, resolved, shade.accent, setMode, setAccent, cycleMode],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
