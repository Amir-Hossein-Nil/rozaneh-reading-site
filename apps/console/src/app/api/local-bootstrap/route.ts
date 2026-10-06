import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from '@site/contracts';
import { localMode } from '../../../lib/supabase';
import { database, localDirectory } from '../../../lib/local-database';
export async function POST(request: Request) {
  if (!localMode()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (request.headers.get('origin') !== (process.env['SITE_ORIGIN'] ?? 'http://localhost:3200'))
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const text = await request.text();
    if (text.length > 1000) throw new Error('Invalid body');
    const input = z
      .object({ email: z.string().email(), token: z.string().regex(/^[a-f0-9]{64}$/) })
      .parse(JSON.parse(text));
    const db = await database();
    const secret = (await readFile(resolve(localDirectory, 'bootstrap-admin.key'), 'utf8')).trim();
    if (
      secret.length !== input.token.length ||
      !timingSafeEqual(Buffer.from(secret), Buffer.from(input.token))
    )
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await db.transaction(async (tx) => {
      const admins = await tx.query(
        "select 1 from public.user_roles where role='admin' and active",
      );
      if (admins.rows.length) throw new Error('Administrator already exists');
      const users = await tx.query<{ id: string }>(
        'select id from auth.users where email=$1 and email_confirmed_at is not null',
        [input.email.toLowerCase()],
      );
      const user = users.rows[0];
      if (!user) throw new Error('A verified account is required');
      await tx.query("insert into public.user_roles values($1,'admin',true)", [user.id]);
      await tx.query(
        "insert into public.audit_events(actor,action,target) values($1,'admin.bootstrap',$2)",
        [user.id, user.id],
      );
    });
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Bootstrap unavailable.',
      },
      { status: 400 },
    );
  }
}
