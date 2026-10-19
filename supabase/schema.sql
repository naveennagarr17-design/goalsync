-- =====================================================================
-- GoalSync database schema, security rules and helper functions
-- Run this ONCE in Supabase: SQL Editor -> New query -> paste -> Run.
-- It is safe to read top to bottom; every section has a comment.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. MEMBER ALLOW-LIST (who may create an account)
-- Only the two e-mail addresses stored here can sign up. Nobody can read
-- or change this table through the website; only you, in the SQL Editor.
-- ---------------------------------------------------------------------
create table public.allowed_members (
  email      text primary key check (email = lower(btrim(email))),
  created_at timestamptz not null default now()
);
alter table public.allowed_members enable row level security;   -- no policies = no access via the API

create function public.limit_allowed_members() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.allowed_members) >= 2 then
    raise exception 'GoalSync is limited to two members.';
  end if;
  return new;
end $$;

create trigger limit_allowed_members
  before insert on public.allowed_members
  for each row execute function public.limit_allowed_members();

-- Block sign-ups from any e-mail that is not on the list.
create function public.enforce_allowed_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.allowed_members where email = lower(btrim(new.email))) then
    raise exception 'This email is not on the GoalSync member list.';
  end if;
  return new;
end $$;

create trigger enforce_allowed_signup
  before insert on auth.users
  for each row execute function public.enforce_allowed_signup();

-- ---------------------------------------------------------------------
-- 2. PROFILES (one row per member; holds name and appearance settings)
-- The e-mail is NOT copied here, so a friend can never read it.
-- ---------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  theme_mode   text not null default 'light'  check (theme_mode in ('light', 'dark', 'system')),
  accent_color text not null default 'forest' check (accent_color in ('forest', 'ocean', 'purple', 'teal', 'orange', 'rose')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Create the profile automatically when a member signs up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 40)
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end $$;

create trigger touch_profile before update on public.profiles
  for each row execute function public.touch_profile();

-- ---------------------------------------------------------------------
-- 3. FRIENDSHIPS (the approved connection between the two members)
-- Rows are created and accepted ONLY through the functions in section 6.
-- ---------------------------------------------------------------------
create table public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  check (requester_id <> addressee_id),
  check ((status = 'accepted') = (accepted_at is not null))
);
-- Only one connection per pair of people, whoever asked first.
create unique index friendships_one_per_pair
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_requester_idx on public.friendships (requester_id);
create index friendships_addressee_idx on public.friendships (addressee_id);

-- ---------------------------------------------------------------------
-- 4. TASKS
-- task_date is a plain DATE (no time zone), so a task never moves to a
-- different day. completed_at is a real timestamp (timestamptz).
-- series_id groups the 30 tasks created by "Repeat daily".
-- ---------------------------------------------------------------------
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 1 and 200),
  category     text not null default 'Other' check (category in ('Study', 'Personal', 'Health', 'Work', 'Fitness', 'Other')),
  task_date    date not null,
  task_time    time,
  completed    boolean not null default false,
  completed_at timestamptz,
  series_id    uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check ((completed and completed_at is not null) or (not completed and completed_at is null))
);
create index tasks_owner_date_idx on public.tasks (owner_id, task_date);
create index tasks_series_idx on public.tasks (series_id) where series_id is not null;
-- A repeat series can never contain two tasks on the same day.
create unique index tasks_series_day_unique on public.tasks (series_id, task_date) where series_id is not null;

create function public.tasks_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.owner_id <> old.owner_id then
      raise exception 'The owner of a task cannot be changed.';
    end if;
    new.created_at := old.created_at;
  end if;

  new.title := btrim(new.title);

  -- The database, not the browser, decides the completion time.
  if new.completed then
    if tg_op = 'UPDATE' and old.completed then
      new.completed_at := coalesce(old.completed_at, now());
    else
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;
  end if;

  new.updated_at := now();
  return new;
end $$;

create trigger tasks_before_write before insert or update on public.tasks
  for each row execute function public.tasks_before_write();

-- ---------------------------------------------------------------------
-- 5. TASK EVENTS (audit history of status changes)
-- Written only by a trigger. Kept even after a task is deleted.
-- ---------------------------------------------------------------------
create table public.task_events (
  id         bigint generated always as identity primary key,
  task_id    uuid not null,
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  event_type text not null check (event_type in ('created', 'completed', 'uncompleted', 'deleted')),
  task_title text not null,
  task_date  date not null,
  created_at timestamptz not null default now()
);
create index task_events_owner_date_idx on public.task_events (owner_id, task_date, created_at);

create function public.tasks_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_events (task_id, owner_id, event_type, task_title, task_date)
    values (new.id, new.owner_id, 'created', new.title, new.task_date);
    if new.completed then
      insert into public.task_events (task_id, owner_id, event_type, task_title, task_date)
      values (new.id, new.owner_id, 'completed', new.title, new.task_date);
    end if;
  elsif tg_op = 'UPDATE' then
    if new.completed is distinct from old.completed then
      insert into public.task_events (task_id, owner_id, event_type, task_title, task_date)
      values (new.id, new.owner_id, case when new.completed then 'completed' else 'uncompleted' end, new.title, new.task_date);
    end if;
  elsif tg_op = 'DELETE' then
    insert into public.task_events (task_id, owner_id, event_type, task_title, task_date)
    values (old.id, old.owner_id, 'deleted', old.title, old.task_date);
    return old;
  end if;
  return new;
end $$;

create trigger tasks_audit after insert or update or delete on public.tasks
  for each row execute function public.tasks_audit();

-- ---------------------------------------------------------------------
-- 6. HELPER FUNCTIONS used by the security rules and by the website
-- ---------------------------------------------------------------------
-- True when the signed-in user's e-mail is on the allow-list.
create function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from auth.users u
    join public.allowed_members a on a.email = lower(btrim(u.email))
    where u.id = auth.uid()
  );
$$;

-- True when two people have an ACCEPTED connection.
create function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
  );
$$;

-- The signed-in member's connection (if any) plus the other person's name.
create function public.get_friendship()
returns table (id uuid, status text, i_am_requester boolean, other_id uuid, other_name text, created_at timestamptz, accepted_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select f.id, f.status, (f.requester_id = auth.uid()),
         p.id, p.display_name, f.created_at, f.accepted_at
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where public.is_member()
    and auth.uid() in (f.requester_id, f.addressee_id);
$$;

-- Ask another member to connect. The answer is always 'ok' so the
-- website cannot be used to find out which e-mails have accounts.
create function public.send_friend_request(friend_email text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  me       uuid := auth.uid();
  target   uuid;
  existing public.friendships;
begin
  if me is null or not public.is_member() then
    raise exception 'Not allowed.';
  end if;

  select u.id into target
  from auth.users u
  join public.allowed_members a on a.email = lower(btrim(u.email))
  join public.profiles p on p.id = u.id
  where lower(btrim(u.email)) = lower(btrim(friend_email));

  if target is null or target = me then
    return 'ok';
  end if;

  select * into existing from public.friendships f
  where (f.requester_id = me and f.addressee_id = target)
     or (f.requester_id = target and f.addressee_id = me);

  if found then
    -- They already asked me: asking back counts as accepting.
    if existing.status = 'pending' and existing.requester_id = target then
      update public.friendships set status = 'accepted', accepted_at = now() where id = existing.id;
    end if;
    return 'ok';
  end if;

  insert into public.friendships (requester_id, addressee_id) values (me, target);
  return 'ok';
end $$;

-- Accept or decline a request that was sent TO the signed-in member.
create function public.respond_friend_request(request_id uuid, accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null or not public.is_member() then
    raise exception 'Not allowed.';
  end if;

  if accept then
    update public.friendships
       set status = 'accepted', accepted_at = now()
     where id = request_id and addressee_id = me and status = 'pending';
  else
    delete from public.friendships
     where id = request_id and addressee_id = me and status = 'pending';
  end if;

  if not found then
    raise exception 'That request was not found.';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (the real lock on your data)
-- ---------------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.friendships enable row level security;
alter table public.tasks       enable row level security;
alter table public.task_events enable row level security;

-- Profiles: you can read and edit only your own.
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) and public.is_member());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and public.is_member())
  with check (id = (select auth.uid()));

-- Friendships: you can see (and remove) only connections you are part of.
-- There is no insert or update policy: use the functions above.
create policy friendships_select_own on public.friendships
  for select to authenticated
  using (public.is_member() and (select auth.uid()) in (requester_id, addressee_id));

create policy friendships_delete_own on public.friendships
  for delete to authenticated
  using (public.is_member() and (select auth.uid()) in (requester_id, addressee_id));

-- Tasks: read your own, plus the tasks of an ACCEPTED friend (read only).
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    public.is_member()
    and (owner_id = (select auth.uid()) or public.are_friends((select auth.uid()), owner_id))
  );

-- Create, edit and delete: only your own tasks. A friend can never write.
create policy tasks_insert_own on public.tasks
  for insert to authenticated
  with check (public.is_member() and owner_id = (select auth.uid()));

create policy tasks_update_own on public.tasks
  for update to authenticated
  using (public.is_member() and owner_id = (select auth.uid()))
  with check (public.is_member() and owner_id = (select auth.uid()));

create policy tasks_delete_own on public.tasks
  for delete to authenticated
  using (public.is_member() and owner_id = (select auth.uid()));

-- Task history: you can read only your own. Nobody can write directly.
create policy task_events_select_own on public.task_events
  for select to authenticated
  using (public.is_member() and owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 8. PERMISSIONS (second lock: remove everything the website must not do)
-- ---------------------------------------------------------------------
revoke all on public.allowed_members, public.profiles, public.friendships, public.tasks, public.task_events from anon, authenticated;

grant select, update on public.profiles    to authenticated;
grant select, delete on public.friendships to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select on public.task_events to authenticated;

revoke execute on function public.is_member()                          from public, anon;
revoke execute on function public.are_friends(uuid, uuid)              from public, anon;
revoke execute on function public.get_friendship()                     from public, anon;
revoke execute on function public.send_friend_request(text)            from public, anon;
revoke execute on function public.respond_friend_request(uuid, boolean) from public, anon;
grant  execute on function public.is_member()                          to authenticated;
grant  execute on function public.are_friends(uuid, uuid)              to authenticated;
grant  execute on function public.get_friendship()                     to authenticated;
grant  execute on function public.send_friend_request(text)            to authenticated;
grant  execute on function public.respond_friend_request(uuid, boolean) to authenticated;
