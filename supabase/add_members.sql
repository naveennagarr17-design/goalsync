-- =====================================================================
-- Step 2: choose the TWO people who may use GoalSync.
-- 1. Replace the two example e-mails below with the real ones.
-- 2. Run in Supabase: SQL Editor -> New query -> paste -> Run.
-- Use the same e-mail you will type when you create each account.
-- Run this BEFORE anyone creates an account.
-- =====================================================================
insert into public.allowed_members (email) values
  (lower('lucifepap@gmail.com')),
  (lower('su7964536@gmail.com'));

-- To check the list later:
-- select email from public.allowed_members;
