export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentKey = 'forest' | 'ocean' | 'purple' | 'teal' | 'orange' | 'rose';

export const CATEGORIES = ['Study', 'Personal', 'Health', 'Work', 'Fitness', 'Other'] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Profile {
  id: string;
  display_name: string;
  theme_mode: ThemeMode;
  accent_color: AccentKey;
  created_at: string;
}

export interface Task {
  id: string;
  owner_id: string;
  title: string;
  category: Category;
  /** "YYYY-MM-DD", a calendar day with no time zone */
  task_date: string;
  /** "HH:MM:SS" or null */
  task_time: string | null;
  completed: boolean;
  completed_at: string | null;
  series_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskInput {
  title: string;
  category: Category;
  task_date: string;
  /** "HH:MM" or null */
  task_time: string | null;
}

export interface Friendship {
  id: string;
  status: 'pending' | 'accepted';
  i_am_requester: boolean;
  other_id: string;
  other_name: string;
  created_at: string;
  accepted_at: string | null;
}

export interface TaskEvent {
  id: number;
  task_id: string;
  event_type: 'created' | 'completed' | 'uncompleted' | 'deleted';
  task_title: string;
  task_date: string;
  created_at: string;
}
