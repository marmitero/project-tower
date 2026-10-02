-- G2 schema foundation only. Game commands, Admin UI/API, storage policies,
-- account provisioning and gameplay transactions are intentionally not included.

begin;

create table public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  level smallint not null default 1 check (level between 1 and 20),
  xp bigint not null default 0 check (xp >= 0),
  coins bigint not null default 0 check (coins >= 0),
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.player_roster (
  user_id uuid not null references public.player_profiles(user_id) on delete cascade,
  class_id text not null check (class_id in ('warrior', 'arcanist', 'rogue')),
  position smallint check (position between 1 and 3),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, class_id),
  unique (user_id, position)
);

create table public.content_drafts (
  draft_id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in (
    'item_template', 'character_template', 'skill', 'enemy_template',
    'floor', 'encounter', 'loot_table', 'consumable', 'trait'
  )),
  content_id text not null check (length(content_id) between 1 and 120),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  author_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, content_id)
);

create table public.content_releases (
  release_id uuid primary key default gen_random_uuid(),
  parent_release_id uuid references public.content_releases(release_id) on delete restrict,
  checksum bytea not null check (octet_length(checksum) = 32),
  published_by uuid,
  reason text not null check (length(reason) between 1 and 500),
  published_at timestamptz not null default now()
);

create table public.release_entries (
  release_id uuid not null references public.content_releases(release_id) on delete restrict,
  kind text not null check (kind in (
    'item_template', 'character_template', 'skill', 'enemy_template',
    'floor', 'encounter', 'loot_table', 'consumable', 'trait'
  )),
  content_id text not null check (length(content_id) between 1 and 120),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  primary key (release_id, kind, content_id)
);

create table public.active_content_release (
  singleton boolean primary key default true check (singleton),
  release_id uuid not null references public.content_releases(release_id) on delete restrict,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id) on delete set null,
  reason text not null check (length(reason) between 1 and 500)
);

-- This fixed, security-barrier view is the only browser-readable surface for releases.
-- Keep its projection/filter narrow; base release tables remain ungranted to browser roles.
create view public.published_content
with (security_barrier = true, security_invoker = false)
as
select r.release_id, r.checksum, r.published_at, e.kind, e.content_id, e.payload
from public.active_content_release a
join public.content_releases r on r.release_id = a.release_id
join public.release_entries e on e.release_id = r.release_id
where a.singleton = true;

create table public.player_items (
  item_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.player_profiles(user_id) on delete cascade,
  template_id text not null check (length(template_id) between 1 and 120),
  content_release_id uuid not null references public.content_releases(release_id) on delete restrict,
  item_level smallint not null check (item_level between 1 and 20),
  rarity text not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary', 'celestial')),
  x_attack smallint not null check (x_attack between 1 and 50),
  x_special_attack smallint not null check (x_special_attack between 1 and 50),
  x_defense smallint not null check (x_defense between 1 and 50),
  x_special_defense smallint not null check (x_special_defense between 1 and 50),
  x_health smallint not null check (x_health between 1 and 50),
  x_critical smallint not null check (x_critical between 1 and 50),
  x_ias smallint not null check (x_ias between 1 and 50),
  x_speed smallint not null check (x_speed between 1 and 50),
  trait_id text,
  source text not null check (source in ('starter', 'drop', 'admin_compensation')),
  discarded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, item_id),
  check (
    (rarity in ('legendary', 'celestial') and trait_id is not null
      and trait_id in ('life_steal', 'guard_break', 'critical_focus', 'concentration'))
    or (rarity not in ('legendary', 'celestial') and trait_id is null)
  )
);

create index player_items_owner_created_idx on public.player_items (user_id, created_at desc);

create table public.equipment_loadouts (
  user_id uuid not null,
  character_id text not null,
  slot text not null check (slot in (
    'weapon', 'chest', 'helmet', 'pants', 'boots', 'armor_gloves',
    'necklace', 'aura', 'wings', 'pet'
  )),
  item_id uuid not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, character_id, slot),
  unique (item_id),
  foreign key (user_id, character_id)
    references public.player_roster(user_id, class_id) on delete cascade,
  foreign key (user_id, item_id)
    references public.player_items(user_id, item_id) on delete restrict
);

create table public.consumable_stacks (
  user_id uuid not null references public.player_profiles(user_id) on delete cascade,
  consumable_id text not null check (consumable_id in (
    'potion_common', 'potion_uncommon', 'potion_rare', 'potion_epic',
    'potion_legendary', 'potion_celestial', 'revive_30', 'revive_50', 'revive_100'
  )),
  quantity smallint not null default 0 check (quantity between 0 and 99),
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, consumable_id)
);

create table public.coin_ledger (
  ledger_id bigint generated always as identity primary key,
  user_id uuid not null references public.player_profiles(user_id) on delete cascade,
  amount bigint not null check (amount <> 0),
  reason text not null check (reason in (
    'initial_grant', 'enemy_reward', 'boss_reward', 'shop_purchase', 'admin_adjustment'
  )),
  reference_id text not null check (length(reference_id) between 1 and 160),
  request_id uuid not null,
  balance_after bigint not null check (balance_after >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, request_id, reason, reference_id)
);

create index coin_ledger_owner_created_idx on public.coin_ledger (user_id, created_at desc);

create table public.bot_settings (
  user_id uuid primary key references public.player_profiles(user_id) on delete cascade,
  potion_enabled boolean not null default true,
  potion_threshold smallint not null default 50
    check (potion_threshold between 10 and 90 and (potion_threshold - 10) % 5 = 0),
  allowed_potion_rarities text[] not null default array['common', 'uncommon', 'rare', 'epic', 'legendary', 'celestial'],
  revive_enabled boolean not null default false,
  skills_enabled boolean not null default true,
  auto_return_on_defeat boolean not null default false,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  check (allowed_potion_rarities <@ array['common', 'uncommon', 'rare', 'epic', 'legendary', 'celestial']::text[])
);

create table public.hunt_sessions (
  session_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.player_profiles(user_id) on delete cascade,
  floor smallint not null check (floor between 1 and 10),
  status text not null check (status in ('active', 'completed', 'defeat', 'returned')),
  content_release_id uuid not null references public.content_releases(release_id) on delete restrict,
  engine_version text not null check (length(engine_version) between 1 and 40),
  event_cursor bigint not null default 0 check (event_cursor >= 0),
  revision bigint not null default 0 check (revision >= 0),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, session_id)
);

create unique index one_active_hunt_per_user_idx
  on public.hunt_sessions (user_id) where status = 'active';
create index hunt_sessions_owner_updated_idx on public.hunt_sessions (user_id, updated_at desc);

-- Server-only seed and simulation snapshot are split from the player-readable session row.
create table public.hunt_session_private_state (
  session_id uuid primary key,
  user_id uuid not null,
  seed bytea not null check (octet_length(seed) >= 32),
  sim_time_ms bigint not null default 0 check (sim_time_ms >= 0),
  snapshot_version smallint not null default 1 check (snapshot_version > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  batch_incomplete boolean not null default false,
  updated_at timestamptz not null default now(),
  foreign key (user_id, session_id)
    references public.hunt_sessions(user_id, session_id) on delete cascade
);

create table public.hunt_events (
  event_id bigint generated always as identity primary key,
  user_id uuid not null references public.player_profiles(user_id) on delete cascade,
  session_id uuid not null,
  sequence bigint not null check (sequence > 0),
  kind text not null check (length(kind) between 1 and 60),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  unique (session_id, sequence),
  unique (user_id, event_id),
  foreign key (user_id, session_id)
    references public.hunt_sessions(user_id, session_id) on delete cascade
);

create index hunt_events_owner_created_idx on public.hunt_events (user_id, created_at desc);

create table public.idempotency_records (
  user_id uuid not null references public.player_profiles(user_id) on delete cascade,
  request_id uuid not null,
  route text not null check (length(route) between 1 and 160),
  body_hash bytea not null check (octet_length(body_hash) = 32),
  state text not null default 'pending' check (state in ('pending', 'complete')),
  status_code smallint check (status_code between 100 and 599),
  response_payload jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (user_id, request_id),
  check (expires_at > created_at),
  check (
    (state = 'pending' and status_code is null and response_payload is null)
    or (state = 'complete' and status_code is not null and response_payload is not null)
  )
);

create index idempotency_expiry_idx on public.idempotency_records (expires_at);

create table public.admin_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'auditor')),
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (revoked_at is null or revoked_at >= granted_at)
);

create table public.admin_audit_log (
  audit_id bigint generated always as identity primary key,
  actor_user_id uuid,
  action text not null check (length(action) between 1 and 100),
  entity_type text not null check (length(entity_type) between 1 and 80),
  entity_id text,
  before_payload jsonb,
  after_payload jsonb,
  release_id uuid references public.content_releases(release_id) on delete set null,
  reason text not null check (length(reason) between 1 and 500),
  result text not null check (result in ('success', 'denied', 'failed')),
  created_at timestamptz not null default now()
);

create index admin_audit_created_idx on public.admin_audit_log (created_at desc);

-- Economic/history rows are append-only during normal operation; an authenticated
-- account deletion may remove its dependent player rows through FK cascades.
create function public.reject_append_only_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception using errcode = '55000', message = 'append_only_record';
end;
$$;

-- Published content releases remain immutable even under direct maintenance requests.
create function public.reject_immutable_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception using errcode = '55000', message = 'append_only_record';
end;
$$;

create trigger coin_ledger_append_only
  before update or delete on public.coin_ledger
  for each row execute function public.reject_append_only_mutation();
create trigger hunt_events_append_only
  before update or delete on public.hunt_events
  for each row execute function public.reject_append_only_mutation();
create trigger admin_audit_append_only
  before update or delete on public.admin_audit_log
  for each row execute function public.reject_append_only_mutation();
create trigger content_releases_append_only
  before update or delete on public.content_releases
  for each row execute function public.reject_immutable_mutation();
create trigger release_entries_append_only
  before update or delete on public.release_entries
  for each row execute function public.reject_immutable_mutation();

-- All application tables are protected. The service_role remains a trusted backend-only role.
do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security', t.relname);
    execute format('alter table public.%I force row level security', t.relname);
    execute format('revoke all on table public.%I from public, anon, authenticated', t.relname);
    execute format('grant all on table public.%I to service_role', t.relname);
  end loop;
end;
$$;

-- Only explicitly owned-row reads are available through the Data API. Mutations go through Edge Functions.
create policy player_profiles_select_own on public.player_profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy player_roster_select_own on public.player_roster
  for select to authenticated using (user_id = (select auth.uid()));
create policy player_items_select_own on public.player_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy equipment_loadouts_select_own on public.equipment_loadouts
  for select to authenticated using (user_id = (select auth.uid()));
create policy consumable_stacks_select_own on public.consumable_stacks
  for select to authenticated using (user_id = (select auth.uid()));
create policy coin_ledger_select_own on public.coin_ledger
  for select to authenticated using (user_id = (select auth.uid()));
create policy bot_settings_select_own on public.bot_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy hunt_sessions_select_own on public.hunt_sessions
  for select to authenticated using (user_id = (select auth.uid()));
create policy hunt_events_select_own on public.hunt_events
  for select to authenticated using (user_id = (select auth.uid()));

-- No grants or policies for drafts, private hunt state, idempotency or administrative data.
-- The active pointer exposes only its single release; RLS scopes published records to that pointer.
create policy active_content_release_read on public.active_content_release
  for select to anon, authenticated using (singleton = true);
create policy content_releases_active_read on public.content_releases
  for select to anon, authenticated using (
    release_id = (select a.release_id from public.active_content_release a where a.singleton = true)
  );
create policy release_entries_active_read on public.release_entries
  for select to anon, authenticated using (
    release_id = (select a.release_id from public.active_content_release a where a.singleton = true)
  );

-- Grant only the intended read surfaces; no direct INSERT/UPDATE/DELETE for browser roles.
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to authenticated, service_role;
grant execute on function auth.uid() to authenticated, service_role;

grant select on public.player_profiles, public.player_roster, public.player_items,
  public.equipment_loadouts, public.consumable_stacks, public.coin_ledger,
  public.bot_settings, public.hunt_sessions, public.hunt_events to authenticated;
grant select on public.published_content to anon, authenticated;

revoke all on function public.reject_append_only_mutation() from public, anon, authenticated;
grant execute on function public.reject_append_only_mutation() to service_role;
revoke all on function public.reject_immutable_mutation() from public, anon, authenticated;
grant execute on function public.reject_immutable_mutation() to service_role;

grant usage, select on all sequences in schema public to service_role;

alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated;

commit;
