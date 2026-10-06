import { createHmac, timingSafeEqual, randomBytes, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cookies } from 'next/headers';
import { localDirectory, database } from './local-database';
async function secret() {
  if (process.env['AUTH_MODE'] === 'supabase') {
    const configured = process.env['COOKIE_SIGNING_KEY'];
    if (!configured || configured.length < 32) throw new Error('Recovery signing key missing');
    return configured;
  }
  await database();
  return readFile(resolve(localDirectory, 'bootstrap-admin.key'), 'utf8');
}
export async function grantRecovery(user: string) {
  const nonce = randomBytes(16).toString('hex');
  const value = `${user}.${Date.now()}.${nonce}`;
  const signature = createHmac('sha256', await secret())
    .update(`account-recovery-v1:${value}`)
    .digest('hex');
  if (process.env['AUTH_MODE'] !== 'supabase') {
    const db = await database();
    await db.exec(
      'create table if not exists local_auth.recovery_grants(nonce_hash text primary key,user_id uuid references auth.users on delete cascade,expires_at timestamptz not null)',
    );
    await db.query(
      "insert into local_auth.recovery_grants values($1,$2,now()+interval '10 minutes')",
      [createHash('sha256').update(nonce).digest('hex'), user],
    );
  }
  (await cookies()).set('site-recovery', `${value}.${signature}`, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env['SITE_ORIGIN']?.startsWith('https:') ?? false,
    maxAge: 600,
    path: '/app',
  });
}
export async function recoveryNonce() {
  const nonce = (await cookies()).get('site-recovery')?.value.split('.')[2];
  return nonce ? createHash('sha256').update(nonce).digest('hex') : '';
}
export async function validRecovery(user: string) {
  const raw = (await cookies()).get('site-recovery')?.value ?? '';
  const [owner, time, nonce, signature] = raw.split('.');
  if (
    owner !== user ||
    !time ||
    !nonce ||
    !signature ||
    !/^\d+$/.test(time) ||
    Date.now() - Number(time) > 600000 ||
    Number(time) > Date.now()
  )
    return false;
  const value = `${owner}.${time}.${nonce}`;
  const expected = createHmac('sha256', await secret())
    .update(`account-recovery-v1:${value}`)
    .digest('hex');
  return (
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}
export async function clearRecovery() {
  (await cookies()).set('site-recovery', '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env['SITE_ORIGIN']?.startsWith('https:') ?? false,
    maxAge: 0,
    path: '/app',
  });
}
