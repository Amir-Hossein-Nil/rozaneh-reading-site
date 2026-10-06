import { NextResponse } from 'next/server';
import { grantRecovery } from '../../../lib/recovery-proof';
import { serverClient, localMode } from '../../../lib/supabase';
import { verifyEmail } from '../../../lib/local-auth';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  try {
    if (localMode()) {
      const token = url.searchParams.get('token');
      if (!token) throw new Error('Missing token');
      const verified = await verifyEmail(token);
      if (verified.kind === 'recovery') await grantRecovery(verified.user_id);
      return NextResponse.redirect(
        new URL(
          verified.kind === 'recovery' ? '/app?recovery=1' : '/app',
          process.env['SITE_ORIGIN'] ?? url.origin,
        ),
      );
    }
    const db = await serverClient();
    if (code) {
      const { data, error } = await db.auth.exchangeCodeForSession(code);
      if (!error) {
        if (url.searchParams.get('next') === 'recovery' && data.user)
          await grantRecovery(data.user.id);
        return NextResponse.redirect(
          new URL(
            url.searchParams.get('next') === 'recovery' ? '/app?recovery=1' : '/app',
            process.env['SITE_ORIGIN'] ?? url.origin,
          ),
        );
      }
    }
  } catch {
    /* A failed callback never establishes a local session. */
  }
  return NextResponse.redirect(
    new URL('/app?authError=1', process.env['SITE_ORIGIN'] ?? url.origin),
  );
}
