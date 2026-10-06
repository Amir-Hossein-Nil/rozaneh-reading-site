import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from 'node:crypto';

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cookies } from 'next/headers';
import { database, localDirectory } from './local-database';
import { validRecovery, clearRecovery, recoveryNonce } from './recovery-proof';
const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
const cookieName = 'site-session';
export const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');
export type LocalUser = { id: string; email: string; email_confirmed_at: string | null };
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt);
  return `${salt}:${hash.toString('hex')}`;
}
async function matches(password: string, stored: string) {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const actual = await derive(password, salt);
  const known = Buffer.from(expected, 'hex');
  return known.length === actual.length && timingSafeEqual(known, actual);
}
export async function rateLimit(key: string, max: number) {
  const db = await database();
  const result = await db.query<{ attempts: number }>(
    `insert into local_auth.rate_limits(key) values($1) on conflict(key) do update set attempts=case when rate_limits.window_start<now()-interval '15 minutes' then 1 else rate_limits.attempts+1 end,window_start=case when rate_limits.window_start<now()-interval '15 minutes' then now() else rate_limits.window_start end returning attempts`,
    [tokenHash(key)],
  );
  if (result.rows[0]!.attempts > max)
    throw new Error('تعداد تلاش‌ها زیاد است؛ پانزده دقیقه بعد امتحان کنید.');
}
async function establish(user: string) {
  const token = randomBytes(32).toString('hex');
  const db = await database();
  await db.query(
    "insert into local_auth.sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '7 days')",
    [tokenHash(token), user],
  );
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env['SITE_ORIGIN']?.startsWith('https:') ?? false,
    path: '/',
    maxAge: 7 * 86400,
  });
}
export async function localUser() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const db = await database();
  const result = await db.query<LocalUser>(
    'select u.id,u.email,u.email_confirmed_at from local_auth.sessions s join auth.users u on u.id=s.user_id join public.profiles p on p.user_id=u.id where s.token_hash=$1 and s.expires_at>now() and not p.suspended',
    [tokenHash(token)],
  );
  return result.rows[0] ?? null;
}
async function mail(user: LocalUser, kind: 'verify' | 'recovery') {
  const db = await database();
  const token = randomBytes(32).toString('hex');
  await db.query(
    "insert into local_auth.email_tokens values($1,$2,$3,now()+interval '30 minutes')",
    [tokenHash(token), user.id, kind],
  );
  const folder = resolve(localDirectory, 'mail');
  await mkdir(folder, { recursive: true });
  await writeFile(
    resolve(folder, `${Date.now()}-${randomUUID()}.json`),
    JSON.stringify(
      {
        to: user.email,
        kind,
        url: `${process.env['SITE_ORIGIN'] ?? 'http://localhost:3200'}/app/auth/callback?token=${token}`,
        expiresInMinutes: 30,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
}
export async function signUp(email: string, password: string, name: string) {
  await rateLimit(`signup:${email.toLowerCase()}`, 5);
  const db = await database();
  const existing = await db.query('select 1 from auth.users where email=$1', [email.toLowerCase()]);
  if (existing.rows.length) return;
  const id = randomUUID();
  const passwordHash = await hashPassword(password);
  await db.transaction(async (tx) => {
    await tx.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [
      id,
      email.toLowerCase(),
      JSON.stringify({ display_name: name }),
    ]);
    await tx.query('insert into local_auth.credentials values($1,$2)', [id, passwordHash]);
  });
  await mail({ id, email, email_confirmed_at: null }, 'verify');
}
export async function signIn(email: string, password: string) {
  await rateLimit(`signin:${email.toLowerCase()}`, 10);
  const db = await database();
  const result = await db.query<LocalUser & { password_hash: string }>(
    'select u.id,u.email,u.email_confirmed_at,c.password_hash from auth.users u join local_auth.credentials c on c.user_id=u.id join public.profiles p on p.user_id=u.id where u.email=$1 and not p.suspended',
    [email.toLowerCase()],
  );
  const user = result.rows[0];
  if (!user) {
    await matches(password, `00000000000000000000000000000000:${'0'.repeat(128)}`);
    throw new Error('اطلاعات ورود معتبر نیست.');
  }
  if (!(await matches(password, user.password_hash))) throw new Error('اطلاعات ورود معتبر نیست.');
  if (!user.email_confirmed_at)
    throw new Error('ابتدا پیوند تأیید حساب را از صندوق نامه محلی باز کنید.');
  await establish(user.id);
}
export async function signOut() {
  const token = (await cookies()).get(cookieName)?.value;
  if (token)
    await (
      await database()
    ).query('delete from local_auth.sessions where token_hash=$1', [tokenHash(token)]);
  (await cookies()).delete(cookieName);
  await clearRecovery();
}
export async function recover(email: string) {
  await rateLimit(`recovery:${email.toLowerCase()}`, 5);
  const users = await (
    await database()
  ).query<LocalUser>('select id,email,email_confirmed_at from auth.users where email=$1', [
    email.toLowerCase(),
  ]);
  if (users.rows[0]) await mail(users.rows[0], 'recovery');
}
export async function verifyEmail(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('Invalid token');
  const db = await database();
  const result = await db.transaction(async (tx) => {
    const found = await tx.query<{ user_id: string; kind: string }>(
      'delete from local_auth.email_tokens where token_hash=$1 and expires_at>now() returning user_id,kind',
      [tokenHash(token)],
    );
    const value = found.rows[0];
    if (!value) throw new Error('Expired token');
    await tx.query(
      'update auth.users set email_confirmed_at=coalesce(email_confirmed_at,now()) where id=$1',
      [value.user_id],
    );
    return value;
  });
  await establish(result.user_id);
  return result;
}
export async function changePassword(password: string) {
  const user = await localUser();
  if (!user || !(await validRecovery(user.id))) throw new Error('پیوند بازیابی معتبر لازم است.');
  const db = await database();
  await db.transaction(async (tx) => {
    const proof = await tx.query(
      'delete from local_auth.recovery_grants where nonce_hash=$1 and user_id=$2 and expires_at>now() returning nonce_hash',
      [await recoveryNonce(), user.id],
    );
    if (!proof.rows.length) throw new Error('پیوند بازیابی مصرف شده یا منقضی است.');
    await tx.query('update local_auth.credentials set password_hash=$1 where user_id=$2', [
      await hashPassword(password),
      user.id,
    ]);
    await tx.query('delete from local_auth.sessions where user_id=$1', [user.id]);
    await tx.query('delete from local_auth.email_tokens where user_id=$1', [user.id]);
  });
  await establish(user.id);
  await clearRecovery();
}
