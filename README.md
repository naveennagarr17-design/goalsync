# GoalSync

**Your Goals. Your Journey. Together.**

A private habit and goal tracker for exactly two people. Each member has their own daily tasks, past history, charts and appearance settings, and can view (but never change) the other member's progress.

Built with React + TypeScript + Vite, Supabase (Auth + PostgreSQL with Row Level Security), Recharts and plain CSS. The website is static and can be hosted on GitHub Pages; all private data lives in Supabase behind database security rules.

> New to this? Follow the step-by-step PDF: **GoalSync_Setup_Guide.pdf**. This README is the short version.

## What is included

| Area | Files |
|---|---|
| Database, security rules, helper functions | `supabase/schema.sql`, `supabase/add_members.sql` |
| Security tests (for developers) | `supabase/tests/` |
| Login, sign-up, password reset, protected routes | `src/context/AuthContext.tsx`, `src/pages/` |
| Dashboard, calendar, tasks, history, analytics, friend view, settings | `src/pages/`, `src/components/` |
| Progress and date rules (one place) | `src/lib/stats.ts`, `src/lib/dates.ts` |
| Themes and light/dark/system modes | `src/lib/themes.ts`, `src/context/ThemeContext.tsx`, `src/index.css` |
| Automatic deployment to GitHub Pages | `.github/workflows/deploy.yml` |
| Checklists and help | `docs/TESTING_CHECKLIST.md`, `docs/TROUBLESHOOTING.md` |

## Quick start (local)

Run every command in the **VS Code terminal, inside the project folder** (the folder that contains `package.json`).

```bash
npm install                  # once, downloads the libraries
cp .env.example .env.local   # Windows (Command Prompt): copy .env.example .env.local
# open .env.local and paste your Supabase Project URL and public (anon/publishable) key
npm run dev                  # opens http://localhost:5173
```

Before the first sign-up, run both SQL files in Supabase (SQL Editor): `supabase/schema.sql`, then `supabase/add_members.sql` (edit the two emails first).

| Command | What it does |
|---|---|
| `npm run dev` | Start the app locally |
| `npm test` | Run the automated tests |
| `npm run typecheck` | Check the TypeScript code |
| `npm run build` | Build the website into `dist/` |

## How privacy works

- Only the two emails in the `allowed_members` table can sign up. A database trigger rejects everyone else, even if they call the API directly.
- Row Level Security is enabled on every table. You can read and change only your own tasks. An accepted friend can **read** your tasks and nothing else.
- Friend connections are created and accepted only by database functions that check who is calling. Typing an email in the form is not proof of anything: the database decides.
- The only key in the website is Supabase's public key, which is designed to be visible. The `service_role`/secret key is never used. `.env.local` is in `.gitignore`.
- The member list, profiles, friend links and status history cannot be read by signed-out visitors.

## Definitions used everywhere

- **Completion %** = completed tasks / total tasks in the date range x 100, rounded. No tasks means "–", never 0%.
- **Tasks dated after today are not counted** in progress numbers (they are "upcoming"), so planning ahead never lowers your percentage.
- **Date ranges** are inclusive and always shown on screen. Weeks start on Monday.
- **Perfect day**: at least one task, all completed. **Streak**: perfect days in a row ending today; if today is not finished yet, the streak continues from yesterday. A day with no tasks breaks it.
- **Dates** are stored as plain calendar dates (no time zone), so a task never moves to another day. Completion time is a real timestamp shown in your local time.
- **Repeat daily** creates the task on the chosen date plus the next 29 days, as one linked series. Days that already have a task with the same title are skipped, so repeating the action is safe.

## What was tested, and what was not

Tested in the build environment:
- `npm run build` and `npm run typecheck` succeed.
- 20 automated tests of date, percentage, streak, range and chart-series logic.
- 9 automated interface tests that render the real app against an in-memory fake database: dashboard numbers, tick/untick, add task + validation, 30-day repeat without duplicates, delete confirmation, past history, read-only friend view, analytics sections, theme saving, "not connected" state.
- 45 database security checks (`supabase/tests/rls_tests.sql`) run against a real PostgreSQL 16 using a stand-in for Supabase's `auth` schema: sign-up blocking, row isolation, friend read-only access, owner locking, completion timestamps, audit history, no signed-out access.

**Not** tested (could not be done there; do these with the checklist in `docs/TESTING_CHECKLIST.md`):
- A real Supabase project (emails, sessions, the real `auth` schema), GitHub Pages deployment, and real browsers and phones. The layout is written to be responsive but has not been looked at on devices.

## Known limits

- Exactly two members by design (enforced in the database).
- Account deletion is not in the app. The owner can delete a user in the Supabase dashboard, which also deletes their tasks.
- Repeating tasks are a linked series (`series_id`), not a full rules engine. Editing one task does not change the others.
- Supabase's built-in email sender is rate-limited; for heavy use add your own SMTP in Supabase.
- Free Supabase projects may be paused after a period of inactivity; resume from the dashboard.
