-- =====================================================================
-- GoalSync security tests (FOR DEVELOPERS, run on a scratch database)
--
-- DO NOT RUN THIS ON YOUR LIVE SUPABASE PROJECT. It creates fake users.
-- How it was run: a throw-away local PostgreSQL with a stand-in "auth"
-- schema (auth.users + auth.uid()), then schema.sql, then this file:
--   psql -v ON_ERROR_STOP=1 -d scratch_db -f stub_auth.sql -f ../schema.sql -f rls_tests.sql
-- Every check prints PASS or stops with FAIL.
-- =====================================================================
create schema t;
grant usage on schema t to public;

create function t.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', msg; end if;
  raise notice 'PASS: %', msg;
end $$;

create function t.as_user(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', u::text, true);
  execute 'set local role authenticated';
end $$;

create function t.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
end $$;

create function t.as_admin() returns void language plpgsql as $$
begin
  execute 'reset role';
end $$;

-- Runs a statement and expects it to be rejected.
create function t.fails(stmt text, msg text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    raise notice 'PASS: % (blocked: %)', msg, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % (statement was allowed)', msg;
end $$;

-- Runs a statement and returns how many rows it changed.
create function t.rows_changed(stmt text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute stmt;
  get diagnostics n = row_count;
  return n;
end $$;

do $$
declare
  alice uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  bob   uuid := 'bbbbbbbb-0000-0000-0000-000000000002';
  eve   uuid := 'eeeeeeee-0000-0000-0000-000000000003';
  n bigint; fid uuid; tid uuid; r text; ev text;
begin
  ---------------------------------------------------------------
  -- Membership
  ---------------------------------------------------------------
  insert into public.allowed_members (email) values ('alice@example.com'), ('bob@example.com');
  perform t.fails($q$insert into public.allowed_members (email) values ('third@example.com')$q$, 'a third allowed member is rejected');
  perform t.fails($q$insert into auth.users (id, email) values ('eeeeeeee-0000-0000-0000-000000000003', 'eve@example.com')$q$, 'sign-up from an e-mail not on the list is rejected');

  insert into auth.users (id, email, raw_user_meta_data) values (alice, 'Alice@Example.com', '{"display_name":"Alice"}');
  insert into auth.users (id, email) values (bob, 'bob@example.com');
  perform t.ok((select count(*) from public.profiles) = 2, 'allowed e-mails (any letter case) get a profile automatically');
  perform t.ok((select display_name from public.profiles where id = bob) = 'bob', 'display name defaults to the part before @');

  ---------------------------------------------------------------
  -- Signed-out visitors
  ---------------------------------------------------------------
  insert into public.tasks (owner_id, title, task_date) values (alice, 'seed', '2026-01-01');
  perform t.as_anon();
  perform t.fails('select * from public.tasks', 'signed-out visitor cannot read tasks');
  perform t.fails('select * from public.profiles', 'signed-out visitor cannot read profiles');
  perform t.fails('select * from public.allowed_members', 'signed-out visitor cannot read the member list');
  perform t.fails($q$select public.send_friend_request('bob@example.com')$q$, 'signed-out visitor cannot call send_friend_request');
  perform t.as_admin();
  delete from public.tasks;
  delete from public.task_events;

  ---------------------------------------------------------------
  -- Own tasks
  ---------------------------------------------------------------
  perform t.as_user(alice);
  insert into public.tasks (owner_id, title, category, task_date) values (alice, '  Read chapter 4  ', 'Study', '2026-10-17') returning id into tid;
  perform t.ok((select title from public.tasks where id = tid) = 'Read chapter 4', 'member can create a task (title is trimmed)');
  perform t.fails($q$insert into public.tasks (owner_id, title, task_date) values ('bbbbbbbb-0000-0000-0000-000000000002', 'planted', '2026-10-17')$q$, 'member cannot create a task owned by someone else');
  perform t.fails($q$insert into public.tasks (owner_id, title, category, task_date) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', 'Gaming', '2026-10-17')$q$, 'invalid category is rejected');
  perform t.fails($q$insert into public.tasks (owner_id, title, task_date) values ('aaaaaaaa-0000-0000-0000-000000000001', '   ', '2026-10-17')$q$, 'empty title is rejected');
  perform t.fails(format($q$update public.tasks set owner_id = %L where id = %L$q$, bob, tid), 'member cannot hand a task to someone else (owner_id is locked)');

  ---------------------------------------------------------------
  -- Completion and audit history
  ---------------------------------------------------------------
  perform t.ok((select completed_at is null from public.tasks where id = tid), 'new task is pending with no completion time');
  update public.tasks set completed = true where id = tid;
  perform t.ok((select completed and completed_at is not null from public.tasks where id = tid), 'checking a task stores completed = true and a completion time');
  update public.tasks set completed_at = null where id = tid;
  perform t.ok((select completed_at is not null from public.tasks where id = tid), 'the browser cannot erase or fake a completion time (the database keeps it)');
  update public.tasks set completed = false where id = tid;
  perform t.ok((select not completed and completed_at is null from public.tasks where id = tid), 'unchecking makes it pending again and clears the time');
  update public.tasks set completed = true where id = tid;
  select string_agg(event_type, ',' order by id) into ev from public.task_events where owner_id = alice;
  perform t.ok(ev = 'created,completed,uncompleted,completed', 'audit history records every status change in order (' || ev || ')');
  perform t.fails($q$insert into public.task_events (task_id, owner_id, event_type, task_title, task_date) values (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'completed', 'fake', '2026-01-01')$q$, 'member cannot write fake history');
  perform t.fails($q$update public.task_events set task_title = 'edited'$q$, 'member cannot edit history');

  ---------------------------------------------------------------
  -- Repeat series
  ---------------------------------------------------------------
  insert into public.tasks (owner_id, title, task_date, series_id) values (alice, 'Run', '2026-10-18', 'cccccccc-0000-0000-0000-000000000001');
  perform t.fails($q$insert into public.tasks (owner_id, title, task_date, series_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Run', '2026-10-18', 'cccccccc-0000-0000-0000-000000000001')$q$, 'the same repeat series cannot have two tasks on one day');

  ---------------------------------------------------------------
  -- Bob cannot see Alice before connecting
  ---------------------------------------------------------------
  perform t.as_user(bob);
  insert into public.tasks (owner_id, title, task_date, completed) values (bob, 'Bob task', '2026-10-17', false);
  perform t.ok((select count(*) from public.tasks) = 1, 'before connecting, a member sees only their own tasks');
  perform t.ok((select count(*) from public.profiles) = 1, 'a member can read only their own profile');
  perform t.fails('select * from public.allowed_members', 'a member cannot read the member list');
  perform t.fails($q$insert into public.friendships (requester_id, addressee_id, status, accepted_at) values ('bbbbbbbb-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','accepted', now())$q$, 'a member cannot create a friendship directly');
  n := t.rows_changed($q$update public.profiles set display_name = 'Hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$q$);
  perform t.ok(n = 0, 'a member cannot edit the other member''s profile');
  update public.profiles set display_name = 'Bobby', theme_mode = 'dark', accent_color = 'ocean' where id = bob;
  perform t.ok((select display_name || theme_mode || accent_color from public.profiles where id = bob) = 'Bobbydarkocean', 'member can save their own name and appearance');
  perform t.fails($q$update public.profiles set accent_color = 'neon' where id = 'bbbbbbbb-0000-0000-0000-000000000002'$q$, 'invalid colour theme is rejected');

  ---------------------------------------------------------------
  -- Friend connection
  ---------------------------------------------------------------
  perform t.as_user(alice);
  r := public.send_friend_request('nobody@example.com');
  perform t.ok(r = 'ok' and (select count(*) from public.friendships) = 0, 'request to an unknown e-mail looks identical and creates nothing');
  r := public.send_friend_request('alice@example.com');
  perform t.ok((select count(*) from public.friendships) = 0, 'a member cannot connect to themselves');
  r := public.send_friend_request('  BOB@example.com ');
  perform t.ok((select count(*) from public.friendships where status = 'pending') = 1, 'request to the other member creates a pending connection');
  perform t.ok((select count(*) from public.tasks) = 2, 'a PENDING connection gives no access to the other member''s tasks');
  select id into fid from public.friendships limit 1;
  perform t.fails(format($q$select public.respond_friend_request(%L, true)$q$, fid), 'the person who asked cannot accept their own request');

  perform t.as_user(bob);
  perform t.ok((select other_name from public.get_friendship()) = 'Alice', 'the receiver sees who asked');
  perform public.respond_friend_request(fid, true);
  perform t.ok((select status from public.get_friendship()) = 'accepted', 'receiver can accept');

  ---------------------------------------------------------------
  -- Friends can READ but never WRITE
  ---------------------------------------------------------------
  perform t.as_user(alice);
  perform t.ok((select count(*) from public.tasks where owner_id = bob) = 1, 'connected friend can read the other member''s tasks');
  perform t.ok((select count(*) from public.profiles) = 1, 'friends still cannot read each other''s profile row (e-mail/settings stay private)');
  perform t.ok((select count(*) from public.task_events where owner_id = bob) = 0, 'friend cannot read the other member''s audit history');
  n := t.rows_changed($q$update public.tasks set completed = true where owner_id = 'bbbbbbbb-0000-0000-0000-000000000002'$q$);
  perform t.ok(n = 0, 'friend cannot edit or complete the other member''s tasks');
  n := t.rows_changed($q$delete from public.tasks where owner_id = 'bbbbbbbb-0000-0000-0000-000000000002'$q$);
  perform t.ok(n = 0, 'friend cannot delete the other member''s tasks');
  perform t.fails($q$insert into public.tasks (owner_id, title, task_date) values ('bbbbbbbb-0000-0000-0000-000000000002', 'planted', '2026-10-17')$q$, 'friend cannot add tasks to the other member''s list');

  ---------------------------------------------------------------
  -- Disconnect and removal from the allow-list
  ---------------------------------------------------------------
  delete from public.friendships where id = fid;
  perform t.ok((select count(*) from public.tasks where owner_id = bob) = 0, 'after disconnecting, friend access stops immediately');
  perform t.as_admin();
  perform t.ok((select count(*) from public.tasks where owner_id = bob) = 1, 'disconnecting does not delete anyone''s tasks');

  delete from public.allowed_members where email = 'bob@example.com';
  perform t.as_user(bob);
  perform t.ok((select count(*) from public.tasks) = 0 and (select count(*) from public.profiles) = 0, 'an account removed from the allow-list can read nothing');
  perform t.fails($q$insert into public.tasks (owner_id, title, task_date) values ('bbbbbbbb-0000-0000-0000-000000000002', 'sneaky', '2026-10-17')$q$, 'an account removed from the allow-list cannot write');
  perform t.as_admin();

  ---------------------------------------------------------------
  -- Deleting a task keeps its history
  ---------------------------------------------------------------
  perform t.as_user(alice);
  delete from public.tasks where id = tid;
  perform t.ok((select count(*) from public.task_events where task_id = tid and event_type = 'deleted') = 1, 'deleting a task records a "deleted" history entry');
end $$;
