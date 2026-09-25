import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migrations = await Promise.all([
  "../migrations/20260923171226_workforce_access_foundation.sql",
  "../migrations/20260923180218_auth_foundation.sql",
  "../migrations/20260925002909_restore_api_auth_usage.sql",
  "../migrations/20260925004000_secure_workforce_stamp_triggers.sql",
].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
const id = "00000000-0000-0000-0000-000000000111";
const db = new PGlite();

try {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
    $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid(), auth.jwt() to authenticated;
  `);
  for (const migration of migrations) await db.exec(migration);
  // Supabase owns auth schema grants and may not retain USAGE for the API role.
  await db.exec("revoke usage on schema auth from planeta_api");
  await db.exec(`insert into auth.users (id) values ('${id}')`);
  await db.exec(`select app_private.stage_initial_owner('${id}', 'Owner Fixture')`);

  const pending = await db.query("select status from app_private.bootstrap_state");
  assert.equal(pending.rows[0].status, "pending");
  assert.equal((await db.query(`select is_active from public.profiles where id='${id}'`)).rows[0].is_active, false);
  await assert.rejects(db.query(`select app_private.stage_initial_owner('${id}', 'Again')`),
    /already used/);

  await db.exec(`
    set role planeta_api;
    set request.jwt.claim.sub = '${id}';
    set request.jwt.claims = '{"sub":"${id}","role":"authenticated","aal":"aal1"}';
  `);
  assert.equal((await db.query("select app_private.activate_initial_owner() as ok")).rows[0].ok, false);
  await db.exec(`set request.jwt.claims = '{"sub":"${id}","role":"authenticated","aal":"aal2"}'`);
  assert.equal((await db.query("select app_private.activate_initial_owner() as ok")).rows[0].ok, true);
  assert.equal((await db.query("select app_private.activate_initial_owner() as ok")).rows[0].ok, false);
  const updated = await db.query(`update public.profiles set display_name = 'Owner Fixture Updated' where id = '${id}' returning id`);
  assert.equal(updated.rowCount, 1);
  await db.exec("reset role; reset request.jwt.claim.sub; reset request.jwt.claims;");
  assert.equal((await db.query("select active_count from app_private.owner_guard")).rows[0].active_count, 1);
  assert.equal((await db.query("select status from app_private.bootstrap_state")).rows[0].status, "complete");
  console.log("one-time pending OWNER and MFA activation: ok");
} finally {
  await db.close();
}
