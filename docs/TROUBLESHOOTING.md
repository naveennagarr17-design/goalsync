# Troubleshooting

## The page says "One more setup step"
The app cannot find your Supabase values. Make sure the file is named exactly `.env.local` (not `.env.local.txt`), is in the project's main folder (next to `package.json`), and has both lines filled in. Then stop the app (Ctrl + C) and run `npm run dev` again.

## "npm is not recognized" / "command not found: npm"
Node.js is not installed, or the terminal was open during installation. Install Node.js (LTS) from nodejs.org, close VS Code completely, open it again, and retry.

## "Cannot find module" or lots of red errors after `npm run dev`
Run `npm install` in the project folder first. You must do this once after downloading.

## Sign-up says "This email is not on the member list"
The email you typed is not in the allow-list. Run `supabase/add_members.sql` (with the real emails) in the Supabase SQL Editor, or check for typos. To see the list: `select email from public.allowed_members;`

## Sign-up says "Database error saving new user"
Same cause as above (the allow-list blocked it), or `schema.sql` did not finish running. Re-run steps 1 and 2 of the setup in order. If `schema.sql` says "already exists", it already ran: do not run it twice.

## I never get the confirmation or reset email
Check spam. Supabase's built-in email service has a low hourly limit, so wait a few minutes before retrying. Make sure the link goes to your live site: Authentication > URL Configuration must have your Site URL and Redirect URLs (see the guide).

## Clicking the email link opens localhost or a "requested path is invalid" page
The Site URL in Supabase is still the default. Set it to your live address, for example `https://yourname.github.io/goalsync/`, and add `https://yourname.github.io/goalsync/**` under Redirect URLs.

## Live website is blank or shows a 404 after deploying
- Settings > Pages > Source must be **GitHub Actions**.
- The repository name decides the address. The workflow sets this automatically; if you renamed the repo, push again.
- Open the Actions tab: a red cross means the build failed. Click it to read the reason.

## Build fails on GitHub with "VITE_SUPABASE_URL" or the page says setup needed
The two repository secrets are missing or misspelled. Settings > Secrets and variables > Actions > New repository secret. Names must be exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Then Actions > latest run > Re-run all jobs.

## Everything loads but I see "You do not have permission to do that"
Row Level Security is blocking the request. Most common cause: the account's email is not on the allow-list, or `schema.sql` was only partly run. Re-run it on a fresh project, or check `select * from pg_policies where schemaname = 'public';` returns rows for `tasks`.

## My friend's tasks do not show
Both people must be connected (Settings shows "Connected with ..."). A pending request shares nothing. After connecting, switch tabs or refresh.

## Task shows on the wrong day
Dates are stored as plain calendar days, so they should never shift. If you see this, make sure you are using the code from this project and not an edited date function (`src/lib/dates.ts`).

## "Invalid API key"
You pasted the wrong value, or an extra space/quote. Use the Project URL and the anon / publishable key. Never the secret or service_role key.

## Still stuck
Open the browser's developer tools (F12) > Console, copy the red message, and search for it together with the word "Supabase", or ask for help with that exact text.
