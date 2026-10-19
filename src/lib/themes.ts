import type { AccentKey, Category } from './types';

interface Shade { accent: string; strong: string; soft: string; on: string }
export interface AccentDef { label: string; light: Shade; dark: Shade }

// Light mode keeps the same light background for every accent; only these colours change.
export const ACCENTS: Record<AccentKey, AccentDef> = {
  forest: {
    label: 'Forest Green',
    light: { accent: '#1f6f46', strong: '#175a38', soft: '#e1f2e9', on: '#ffffff' },
    dark: { accent: '#4cc38a', strong: '#6fd6a2', soft: '#173326', on: '#08150f' },
  },
  ocean: {
    label: 'Ocean Blue',
    light: { accent: '#1d6fb8', strong: '#165a96', soft: '#e0eefa', on: '#ffffff' },
    dark: { accent: '#5aa9f0', strong: '#82bff5', soft: '#14283b', on: '#07131f' },
  },
  purple: {
    label: 'Midnight Purple',
    light: { accent: '#5b3fb5', strong: '#4a3294', soft: '#ebe6f8', on: '#ffffff' },
    dark: { accent: '#9a85f0', strong: '#b4a4f5', soft: '#231d3d', on: '#0e0a1f' },
  },
  teal: {
    label: 'Teal',
    light: { accent: '#0c7b7d', strong: '#0a6264', soft: '#ddf2f2', on: '#ffffff' },
    dark: { accent: '#38c4c6', strong: '#66d4d6', soft: '#12302f', on: '#04191a' },
  },
  orange: {
    label: 'Sunset Orange',
    light: { accent: '#c94a14', strong: '#a53b0e', soft: '#fbe8de', on: '#ffffff' },
    dark: { accent: '#f08a56', strong: '#f4a47a', soft: '#3a2216', on: '#1d0d04' },
  },
  rose: {
    label: 'Rose Pink',
    light: { accent: '#cc2f68', strong: '#a8244f', soft: '#fae3eb', on: '#ffffff' },
    dark: { accent: '#ef6b97', strong: '#f39ab6', soft: '#3a1a26', on: '#1f0912' },
  },
};

export const ACCENT_KEYS = Object.keys(ACCENTS) as AccentKey[];

/** Fixed colours so a category looks the same on every chart. */
export const CATEGORY_COLORS: Record<Category, string> = {
  Study: '#4f7cff',
  Personal: '#a56bd6',
  Health: '#e0615a',
  Work: '#2a9fd0',
  Fitness: '#f0a03a',
  Other: '#8a9a93',
};

export function isAccentKey(value: string | null | undefined): value is AccentKey {
  return !!value && value in ACCENTS;
}
