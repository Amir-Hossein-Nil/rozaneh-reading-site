import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir, mkdir, writeFile, open, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { previewCatalog } from '@site/content/catalog';
import { parseExport } from '@site/content/import';
export const projectRoot = process.env['PROJECT_ROOT'] ?? resolve(process.cwd(), '../..');
export const localDirectory = resolve(projectRoot, '.local');
const system = '00000000-0000-4000-8000-000000000001';
type Globals = typeof globalThis & {
  siteDatabase?: Promise<PGlite>;
  siteDatabaseLock?: Promise<void>;
};
export async function database() {
  const state = globalThis as Globals;
  await mkdir(localDirectory, { recursive: true });
  await writeFile(resolve(localDirectory, 'bootstrap-admin.key'), randomBytes(32).toString('hex'), {
    flag: 'wx',
    mode: 0o600,
  }).catch((error) => {
    if ((error as { code?: string }).code !== 'EEXIST') throw error;
  });
  if (!state.siteDatabaseLock) state.siteDatabaseLock = acquireLock();
  await state.siteDatabaseLock;
  if (!state.siteDatabase)
    state.siteDatabase = initialize().catch((error) => {
      delete state.siteDatabase;
      throw error;
    });
  return state.siteDatabase;
}
async function acquireLock() {
  await mkdir(localDirectory, { recursive: true });
  const file = resolve(localDirectory, 'postgres.lock');
  try {
    const handle = await open(file, 'wx');
    await handle.writeFile(String(process.pid));
    await handle.close();
  } catch (error) {
    if ((error as { code?: string }).code !== 'EEXIST') throw error;
    const pid = Number(await readFile(file, 'utf8'));
    if (pid === process.pid) return;
    let alive = false;
    try {
      process.kill(pid, 0);
      alive = true;
    } catch {
      /* A stopped process can leave its own lock file. */
    }
    if (alive)
      throw new Error(
        'The local database is already used by another server. Stop that server before starting another.',
      );
    await unlink(file);
    const handle = await open(file, 'wx');
    await handle.writeFile(String(process.pid));
    await handle.close();
  }
}
async function initialize() {
  await mkdir(localDirectory, { recursive: true });
  await writeFile(resolve(localDirectory, 'bootstrap-admin.key'), randomBytes(32).toString('hex'), {
    flag: 'wx',
    mode: 0o600,
  }).catch((error) => {
    if ((error as { code?: string }).code !== 'EEXIST') throw error;
  });
  const db = new PGlite(resolve(localDirectory, 'postgres'));
  await db.exec(`create table if not exists public.local_migrations(name text primary key);`);
  const installed = await db.query<{ name: string }>('select name from public.local_migrations');
  if (!installed.rows.length) {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key default gen_random_uuid(),email text unique,email_confirmed_at timestamptz,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
    );
  }
  for (const file of (await readdir(resolve(projectRoot, 'supabase/migrations'))).sort())
    if (!installed.rows.some((r) => r.name === file)) {
      await db.exec(await readFile(resolve(projectRoot, 'supabase/migrations', file), 'utf8'));
      await db.query('insert into public.local_migrations values($1)', [file]);
    }
  await db.exec(`create schema if not exists local_auth;
 create table if not exists local_auth.credentials(user_id uuid primary key references auth.users on delete cascade,password_hash text not null);
 create table if not exists local_auth.sessions(token_hash text primary key,user_id uuid references auth.users on delete cascade,expires_at timestamptz not null,created_at timestamptz not null default now());
 create table if not exists local_auth.email_tokens(token_hash text primary key,user_id uuid references auth.users on delete cascade,kind text not null check(kind in ('verify','recovery')),expires_at timestamptz not null);
 create table if not exists local_auth.rate_limits(key text primary key,attempts integer not null default 1,window_start timestamptz not null default now());
 revoke all on schema local_auth from public,anon,authenticated;
 revoke all on all tables in schema local_auth from public,anon,authenticated;`);
  const seeded = await db.query(
    "select 1 from public.local_migrations where name='local-development-seed-v1'",
  );
  if (!seeded.rows.length) {
    await db.query(
      'insert into auth.users(id,raw_user_meta_data) values($1,$2) on conflict do nothing',
      [system, JSON.stringify({ display_name: 'نمونه توسعه محلی' })],
    );
    await db.query("insert into public.user_roles values($1,'admin',true) on conflict do nothing", [
      system,
    ]);
    const archives = await readdir(resolve(localDirectory, 'source-archive')).catch(() => []);
    for (const file of archives.filter((f) => f.endsWith('.json'))) {
      const bytes = await readFile(resolve(localDirectory, 'source-archive', file));
      const records = parseExport(JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '')));
      await db.transaction(async (tx) => {
        await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [system]);
        await tx.query('select public.import_sources($1,$2,$3)', [
          file.startsWith('bale-supplemental') ? 'bale-supplemental' : 'bale-main',
          JSON.stringify(records),
          createHash('sha256').update(bytes).digest('hex'),
        ]);
      });
    }
    await db.transaction(async (tx) => {
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [system]);
      for (const c of previewCatalog.collections)
        await tx.query('select public.save_collection($1)', [JSON.stringify(c)]);
      for (const p of previewCatalog.posts) {
        const source = await tx.query<{ id: string }>(
          'select v.id from public.source_record_versions v join public.source_records s on s.id=v.record_id where s.dataset=$1 and s.external_id=$2 and v.original_text=$3',
          [p.dataset, p.sourceIds[0], p.originalText],
        );
        if (!source.rows.length) {
          await tx.query('select public.import_sources($1,$2,$3)', [
            p.dataset,
            JSON.stringify([{ id: p.sourceIds[0], text: p.originalText, time: null }]),
            createHash('sha256').update(p.originalText).digest('hex'),
          ]);
          source.rows = (
            await tx.query<{ id: string }>(
              'select v.id from public.source_record_versions v join public.source_records s on s.id=v.record_id where s.dataset=$1 and s.external_id=$2',
              [p.dataset, p.sourceIds[0]],
            )
          ).rows;
        }
        const sourceId = source.rows[0]!.id;
        await tx.query('select public.save_post($1,0,$2,true)', [
          JSON.stringify(p),
          'Local development fixture; header and ordering verified against preserved source. Public deployment requires separate editorial sign-off.',
        ]);
        await tx.query('select public.link_post_source($1,$2)', [p.id, sourceId]);
        await tx.query("select public.editorial_action('review',$1)", [
          JSON.stringify({
            id: sourceId,
            decision: 'accepted',
            reason:
              'Local development sample: original header and order verified; not a production approval.',
          }),
        ]);
        const duplicates = await tx.query<{ first_version: string; second_version: string }>(
          'select first_version,second_version from public.duplicate_candidates where first_version=$1 or second_version=$1',
          [sourceId],
        );
        for (const pair of duplicates.rows)
          await tx.query("select public.editorial_action('duplicate',$1)", [
            JSON.stringify({
              first: pair.first_version,
              second: pair.second_version,
              decision: 'duplicate',
              reason:
                'Development fixture uses the named source once. Other candidate sources remain unpublished and require editorial review.',
            }),
          ]);
        await tx.query("select public.transition_post($1,1,'in_review')", [p.id]);
        await tx.query("select public.transition_post($1,2,'published')", [p.id]);
      }
      await tx.query("insert into public.local_migrations values('local-development-seed-v1')");
    });
    // The seed identity has no credentials or sessions and cannot sign in.
    await db.query('update public.user_roles set active=false where user_id=$1', [system]);
  }
  return db;
}
export type Row = Record<string, unknown>;
export async function queryAs(user: string | null, sql: string, params: unknown[] = []) {
  const db = await database();
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${user ? 'authenticated' : 'anon'}`);
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [user ?? '']);
    return tx.query<Row>(sql, params);
  });
}
