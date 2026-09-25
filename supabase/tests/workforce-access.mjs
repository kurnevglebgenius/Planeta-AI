import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(
  new URL("../migrations/20260923171226_workforce_access_foundation.sql", import.meta.url),
  "utf8",
);
const seed = await readFile(new URL("../seed.sql", import.meta.url), "utf8");

const ids = {
  owner: "00000000-0000-0000-0000-000000000001",
  nextOwner: "00000000-0000-0000-0000-000000000002",
  sellerA: "00000000-0000-0000-0000-000000000003",
  sellerB: "00000000-0000-0000-0000-000000000004",
  production: "00000000-0000-0000-0000-000000000005",
  disabled: "00000000-0000-0000-0000-000000000006",
};

const db = new PGlite();

async function as(role, id, aal, sql) {
  const claims = JSON.stringify({ sub: id, aal, role });
  await db.exec(`
    set role ${role};
    set request.jwt.claim.sub = '${id ?? ""}';
    set request.jwt.claims = '${claims}';
  `);
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role; reset request.jwt.claim.sub; reset request.jwt.claims;");
  }
}

async function rejectsTransaction(sql, expected) {
  await db.exec("begin");
  let rejected = false;
  try {
    await db.exec(sql);
    await db.exec("commit");
  } catch (error) {
    rejected = true;
    assert.match(String(error), expected);
    await db.exec("rollback");
  }
  assert.equal(rejected, true, `Expected transaction to fail: ${sql}`);
}

async function countAs(role, id, aal, table) {
  const result = await as(role, id, aal, `select count(*)::int as n from public.${table}`);
  return result.rows[0].n;
}

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
  await db.exec(migration);
  await db.exec(seed);

  const locations = await db.query("select code from public.salons order by code");
  assert.deepEqual(locations.rows.map((row) => row.code), ["SALON_A", "SALON_B"]);
  const rls = await db.query(`
    select count(*)::int as n from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in
      ('profiles','roles','salons','workshops','profile_roles',
       'profile_salons','profile_workshops','audit_events') and c.relrowsecurity
  `);
  assert.equal(rls.rows[0].n, 8);

  await db.exec(`
    begin;
    insert into auth.users (id) values
      ('${ids.owner}'), ('${ids.nextOwner}'), ('${ids.sellerA}'),
      ('${ids.sellerB}'), ('${ids.production}'), ('${ids.disabled}');
    insert into public.profiles (id, display_name) values
      ('${ids.owner}', 'Owner Fixture'),
      ('${ids.nextOwner}', 'Second Owner Fixture'),
      ('${ids.sellerA}', 'Seller A Fixture'),
      ('${ids.sellerB}', 'Seller B Fixture'),
      ('${ids.production}', 'Production Fixture'),
      ('${ids.disabled}', 'Disabled Fixture');
    insert into public.profile_roles (profile_id, role_code) values
      ('${ids.owner}', 'OWNER'), ('${ids.owner}', 'SELLER'),
      ('${ids.sellerA}', 'SELLER'), ('${ids.sellerB}', 'SELLER'),
      ('${ids.production}', 'PRODUCTION'), ('${ids.disabled}', 'SELLER');
    insert into public.profile_salons (profile_id, salon_id)
      select '${ids.owner}', id from public.salons;
    insert into public.profile_salons (profile_id, salon_id)
      select '${ids.sellerA}', id from public.salons;
    insert into public.profile_salons (profile_id, salon_id)
      select '${ids.sellerB}', id from public.salons where code = 'SALON_B';
    insert into public.profile_salons (profile_id, salon_id)
      select '${ids.disabled}', id from public.salons where code = 'SALON_A';
    insert into public.profile_workshops (profile_id, workshop_id)
      select '${ids.production}', id from public.workshops;
    update public.profiles set is_active = true
      where id in ('${ids.owner}', '${ids.sellerA}', '${ids.sellerB}', '${ids.production}');
    commit;
  `);

  assert.equal((await db.query("select active_count from app_private.owner_guard")).rows[0].active_count, 1);
  assert.equal(await countAs("authenticated", ids.owner, "aal2", "profiles"), 6);
  assert.equal(await countAs("authenticated", ids.owner, "aal1", "profiles"), 1);
  assert.equal(await countAs("authenticated", ids.owner, "aal1", "salons"), 2);
  assert.equal(await countAs("authenticated", ids.owner, "aal1", "workshops"), 0);
  assert.equal(await countAs("authenticated", ids.sellerA, "aal1", "salons"), 2);
  assert.equal(await countAs("authenticated", ids.sellerB, "aal1", "salons"), 1);
  assert.equal(await countAs("authenticated", ids.sellerB, "aal1", "workshops"), 0);
  assert.equal(await countAs("authenticated", ids.production, "aal1", "workshops"), 1);
  assert.equal(await countAs("authenticated", ids.production, "aal1", "salons"), 0);
  assert.equal(await countAs("authenticated", ids.production, "aal1", "profiles"), 1);
  assert.equal(await countAs("authenticated", ids.disabled, "aal1", "profiles"), 0);
  assert.equal(await countAs("authenticated", ids.disabled, "aal1", "salons"), 0);
  assert.equal(await countAs("planeta_api", ids.owner, "aal2", "audit_events") > 0, true);
  assert.equal(await countAs("planeta_api", ids.owner, "aal1", "audit_events"), 0);
  assert.equal(await countAs("planeta_api", ids.sellerA, "aal1", "audit_events"), 0);
  await assert.rejects(
    as("anon", null, "aal1", "select count(*) from public.profiles"),
    /permission denied/,
  );

  await rejectsTransaction(
    `insert into public.profile_roles (profile_id, role_code)
     values ('${ids.sellerA}', 'PRODUCTION')`,
    /PRODUCTION cannot be combined/,
  );
  await rejectsTransaction(
    `insert into public.profile_roles (profile_id, role_code)
     values ('${ids.owner}', 'PRODUCTION')`,
    /PRODUCTION cannot be combined/,
  );
  await rejectsTransaction(
    `delete from public.profile_salons where profile_id = '${ids.sellerB}'`,
    /active SELLER requires a salon/,
  );
  await rejectsTransaction(
    `delete from public.profile_workshops where profile_id = '${ids.production}'`,
    /active PRODUCTION requires a workshop/,
  );
  await rejectsTransaction(
    `update public.profiles set is_active = true where id = '${ids.nextOwner}'`,
    /active profile requires a role/,
  );
  await rejectsTransaction(
    `update public.profiles set is_active = false where id = '${ids.owner}'`,
    /last active OWNER/,
  );
  await rejectsTransaction(
    `delete from public.profile_roles where profile_id = '${ids.owner}' and role_code = 'OWNER'`,
    /last active OWNER/,
  );

  const forbidden = await as(
    "planeta_api", ids.sellerA, "aal1",
    `update public.profiles set is_active = false where id = '${ids.sellerB}' returning id`,
  );
  assert.equal(forbidden.rowCount, 0);
  const noMfa = await as(
    "planeta_api", ids.owner, "aal1",
    `update public.profiles set is_active = false where id = '${ids.sellerB}' returning id`,
  );
  assert.equal(noMfa.rowCount, 0);
  await assert.rejects(
    as("authenticated", ids.owner, "aal2",
      `update public.profiles set is_active = false where id = '${ids.sellerB}'`),
    /permission denied/,
  );

  await as("planeta_api", ids.owner, "aal2",
    `insert into public.profile_salons (profile_id, salon_id)
     select '${ids.sellerB}', id from public.salons where code = 'SALON_A'`);
  assert.equal(await countAs("authenticated", ids.sellerB, "aal1", "salons"), 2);
  await as("planeta_api", ids.owner, "aal2",
    `delete from public.profile_salons where profile_id = '${ids.sellerB}'
     and salon_id = (select id from public.salons where code = 'SALON_B')`);
  assert.equal(await countAs("authenticated", ids.sellerB, "aal1", "salons"), 1);

  const disabled = await as(
    "planeta_api", ids.owner, "aal2",
    `update public.profiles set is_active = false where id = '${ids.sellerA}' returning id`,
  );
  assert.equal(disabled.rowCount, 1);
  assert.equal(await countAs("authenticated", ids.sellerA, "aal1", "salons"), 0);
  const reactivated = await as(
    "planeta_api", ids.owner, "aal2",
    `update public.profiles set is_active = true where id = '${ids.sellerA}' returning id`,
  );
  assert.equal(reactivated.rowCount, 1);
  assert.equal(await countAs("authenticated", ids.sellerA, "aal1", "salons"), 2);

  await db.exec(`
    begin;
    insert into public.profile_roles (profile_id, role_code)
      values ('${ids.nextOwner}', 'OWNER');
    update public.profiles set is_active = true where id = '${ids.nextOwner}';
    commit;
  `);
  assert.equal((await db.query("select active_count from app_private.owner_guard")).rows[0].active_count, 2);
  await as("planeta_api", ids.nextOwner, "aal2",
    `update public.profiles set is_active = false where id = '${ids.owner}'`);
  assert.equal((await db.query("select active_count from app_private.owner_guard")).rows[0].active_count, 1);
  assert.equal(await countAs("authenticated", ids.owner, "aal2", "profiles"), 0);
  const oldOwnerToken = await as(
    "planeta_api", ids.owner, "aal2",
    `update public.profiles set is_active = false where id = '${ids.sellerB}' returning id`,
  );
  assert.equal(oldOwnerToken.rowCount, 0);
  await rejectsTransaction(
    `update public.profiles set is_active = false where id = '${ids.nextOwner}'`,
    /last active OWNER/,
  );

  const audit = await db.query(`
    select count(*)::int as n from public.audit_events
    where action in ('PROFILE_DEACTIVATED', 'PROFILE_REACTIVATED')
  `);
  assert.ok(audit.rows[0].n >= 3);
  await assert.rejects(db.exec("delete from public.audit_events"), /immutable workforce record/);
  console.log("workforce migration, constraints, RLS, continuity, seed, and audit: ok");
} finally {
  await db.close();
}
