import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test, { before, after } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.resolve(here, '../migrations/20260928000000_g2_core_schema.sql');
const USER_A = '10000000-0000-4000-8000-000000000001';
const USER_B = '10000000-0000-4000-8000-000000000002';
const USER_C = '10000000-0000-4000-8000-000000000003';
const RELEASE_OLD = '20000000-0000-4000-8000-000000000001';
const RELEASE_ACTIVE = '20000000-0000-4000-8000-000000000002';
const SESSION_A = '30000000-0000-4000-8000-000000000001';
const SESSION_B = '30000000-0000-4000-8000-000000000002';
let db;

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid
      language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to authenticated, service_role;
    insert into auth.users (id) values ('${USER_A}'), ('${USER_B}');
  `);

  const migration = await readFile(migrationPath, 'utf8');
  await db.exec(migration);

  await db.exec(`
    insert into public.player_profiles (user_id, level, coins)
    values ('${USER_A}', 1, 300), ('${USER_B}', 1, 300);
    insert into public.player_roster (user_id, class_id, position)
    values ('${USER_A}', 'warrior', 1), ('${USER_B}', 'arcanist', 1);

    insert into public.content_releases (release_id, checksum, reason)
    values
      ('${RELEASE_OLD}', decode(repeat('1', 64), 'hex'), 'fixture older release'),
      ('${RELEASE_ACTIVE}', decode(repeat('2', 64), 'hex'), 'fixture active release');
    insert into public.release_entries (release_id, kind, content_id, payload)
    values
      ('${RELEASE_OLD}', 'floor', 'old-floor', '{"label":"older fixture"}'),
      ('${RELEASE_ACTIVE}', 'floor', 'floor-1', '{"label":"published fixture"}');
    insert into public.active_content_release (singleton, release_id, reason)
    values (true, '${RELEASE_ACTIVE}', 'fixture active pointer');
  `);
});

after(async () => {
  if (db) await db.close();
});

async function asRole(role, userId, action) {
  await db.exec(`set role ${role}`);
  try {
    if (userId) {
      await db.query('select set_config($1, $2, false)', ['request.jwt.claim.sub', userId]);
    }
    return await action();
  } finally {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

const insertItem = async ({ userId = USER_A, xAttack = 10, rarity = 'common', traitId = null } = {}) =>
  db.query(
    `insert into public.player_items (
      user_id, template_id, content_release_id, item_level, rarity,
      x_attack, x_special_attack, x_defense, x_special_defense,
      x_health, x_critical, x_ias, x_speed, trait_id, source
    ) values ($1, 'sword-fixture', $2, 1, $3, $4, 10, 10, 10, 10, 10, 10, 10, $5, 'drop')
    returning item_id`,
    [userId, RELEASE_ACTIVE, rarity, xAttack, traitId],
  );

test('migration installs the schema with RLS enabled and forced on all application tables', async () => {
  const { rows } = await db.query(`
    select c.relname, c.relrowsecurity, c.relforcerowsecurity
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by c.relname
  `);
  assert.equal(rows.length, 17);
  assert.ok(rows.every((row) => row.relrowsecurity && row.relforcerowsecurity));
});

test('authenticated users read only their own rows and cannot write directly', async () => {
  const ownRows = await asRole('authenticated', USER_A, async () => {
    const result = await db.query('select user_id from public.player_profiles order by user_id');
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].user_id, USER_A);
    await assert.rejects(
      db.query("update public.player_profiles set coins = 999 where user_id = $1", [USER_A]),
      /permission denied/i,
    );
    await assert.rejects(
      db.query("insert into public.player_profiles (user_id) values ('40000000-0000-4000-8000-000000000001')"),
      /permission denied/i,
    );
    return result.rows;
  });
  assert.equal(ownRows.length, 1);
});

test('anon cannot read player or draft data; public catalog exposes only the active immutable release', async () => {
  await asRole('anon', null, async () => {
    const catalog = await db.query('select release_id, kind, content_id, payload from public.published_content');
    assert.equal(catalog.rows.length, 1);
    assert.equal(catalog.rows[0].release_id, RELEASE_ACTIVE);
    assert.equal(catalog.rows[0].content_id, 'floor-1');
    await assert.rejects(db.query('select * from public.player_profiles'), /permission denied/i);
    await assert.rejects(db.query('select * from public.content_drafts'), /permission denied/i);
    await assert.rejects(db.query('select * from public.release_entries'), /permission denied/i);
  });
});

test('private hunt seed/idempotency/admin tables have no direct player grants', async () => {
  await db.query(
    `insert into public.hunt_sessions (session_id, user_id, floor, status, content_release_id, engine_version)
     values ($1, $2, 1, 'active', $3, 'g2-fixture')`,
    [SESSION_A, USER_A, RELEASE_ACTIVE],
  );
  await db.query(
    `insert into public.hunt_session_private_state (session_id, user_id, seed, snapshot)
     values ($1, $2, decode(repeat('a', 64), 'hex'), '{"fixture":true}')`,
    [SESSION_A, USER_A],
  );

  await asRole('authenticated', USER_A, async () => {
    const safeSession = await db.query('select session_id, floor, status, event_cursor from public.hunt_sessions');
    assert.equal(safeSession.rows.length, 1);
    assert.equal(safeSession.rows[0].session_id, SESSION_A);
    await assert.rejects(db.query('select * from public.hunt_session_private_state'), /permission denied/i);
    await assert.rejects(db.query('select * from public.idempotency_records'), /permission denied/i);
    await assert.rejects(db.query('select * from public.admin_memberships'), /permission denied/i);
    await assert.rejects(db.query('select * from public.admin_audit_log'), /permission denied/i);
  });
});

test('constraints cover x range, trait eligibility, active-hunt uniqueness and item ownership', async () => {
  const { rows } = await insertItem();
  const itemId = rows[0].item_id;

  await assert.rejects(insertItem({ xAttack: 51 }), /check constraint/i);
  await assert.rejects(insertItem({ rarity: 'common', traitId: 'life_steal' }), /check constraint/i);
  await assert.rejects(insertItem({ rarity: 'legendary', traitId: null }), /check constraint/i);
  await assert.rejects(
    db.query(
      `insert into public.equipment_loadouts (user_id, character_id, slot, item_id)
       values ($1, 'arcanist', 'weapon', $2)`,
      [USER_B, itemId],
    ),
    /foreign key constraint/i,
  );
  await assert.rejects(
    db.query(
      `insert into public.hunt_sessions (user_id, floor, status, content_release_id, engine_version)
       values ($1, 2, 'active', $2, 'g2-fixture')`,
      [USER_A, RELEASE_ACTIVE],
    ),
    /unique constraint/i,
  );
});

test('ledger, hunt events and published releases reject UPDATE/DELETE', async () => {
  await db.query(
    `insert into public.coin_ledger (user_id, amount, reason, reference_id, request_id, balance_after)
     values ($1, 300, 'initial_grant', 'fixture-start', '40000000-0000-4000-8000-000000000001', 300)`,
    [USER_A],
  );
  await assert.rejects(
    db.query("update public.coin_ledger set balance_after = 0 where reference_id = 'fixture-start'"),
    /append_only_record/,
  );
  await assert.rejects(
    db.query('update public.content_releases set reason = $1 where release_id = $2', ['rewritten', RELEASE_ACTIVE]),
    /append_only_record/,
  );
  await assert.rejects(
    db.query('delete from public.release_entries where release_id = $1', [RELEASE_ACTIVE]),
    /append_only_record/,
  );
});

test('idempotency key is unique per account; body-conflict semantics remain application work', async () => {
  const requestId = '50000000-0000-4000-8000-000000000001';
  const insertRecord = () => db.query(
    `insert into public.idempotency_records (user_id, request_id, route, body_hash, expires_at)
     values ($1, $2, '/game/team', decode(repeat('a', 64), 'hex'), now() + interval '1 day')`,
    [USER_A, requestId],
  );
  await insertRecord();
  await assert.rejects(insertRecord(), /unique constraint/i);
});

test('auth account deletion cascades player data despite append-only history, without deleting admin audit', async () => {
  await db.exec(`insert into auth.users (id) values ('${USER_C}')`);
  await db.query('insert into public.player_profiles (user_id, coins) values ($1, 25)', [USER_C]);
  await db.query(
    `insert into public.hunt_sessions (user_id, floor, status, content_release_id, engine_version)
     values ($1, 1, 'completed', $2, 'g2-fixture')`,
    [USER_C, RELEASE_ACTIVE],
  );
  const { rows } = await db.query('select session_id from public.hunt_sessions where user_id = $1', [USER_C]);
  await db.query(
    `insert into public.hunt_events (user_id, session_id, sequence, kind, payload)
     values ($1, $2, 1, 'fixture', '{"test":true}')`,
    [USER_C, rows[0].session_id],
  );
  await db.query(
    `insert into public.coin_ledger (user_id, amount, reason, reference_id, request_id, balance_after)
     values ($1, 25, 'initial_grant', 'fixture-delete', '60000000-0000-4000-8000-000000000001', 25)`,
    [USER_C],
  );
  await db.query(
    `insert into public.admin_audit_log (actor_user_id, action, entity_type, reason, result)
     values ($1, 'fixture_actor', 'schema-test', 'audit retention fixture', 'success')`,
    [USER_C],
  );

  await db.query('delete from auth.users where id = $1', [USER_C]);
  const remaining = await db.query(`
    select
      (select count(*)::int from public.player_profiles where user_id = $1) as profiles,
      (select count(*)::int from public.coin_ledger where user_id = $1) as ledger,
      (select count(*)::int from public.hunt_sessions where user_id = $1) as sessions,
      (select count(*)::int from public.hunt_events where user_id = $1) as events,
      (select count(*)::int from public.admin_audit_log where actor_user_id = $1) as audit
  `, [USER_C]);
  assert.deepEqual(remaining.rows[0], { profiles: 0, ledger: 0, sessions: 0, events: 0, audit: 1 });
});

test('trusted server role bypasses RLS as expected (server credential remains secret)', async () => {
  await asRole('service_role', null, async () => {
    const result = await db.query('select count(*)::int as count from public.player_profiles');
    assert.equal(result.rows[0].count, 2);
    const audit = await db.query(
      `insert into public.admin_audit_log (actor_user_id, action, entity_type, reason, result)
       values ($1, 'fixture_write', 'schema-test', 'test backend grants/identity sequence', 'success')
       returning audit_id`,
      [USER_A],
    );
    assert.ok(audit.rows[0].audit_id > 0);
  });
});
