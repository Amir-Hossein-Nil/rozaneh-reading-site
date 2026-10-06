import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { localClient } from './local-client';
export function localMode() {
  return process.env['AUTH_MODE'] !== 'supabase';
}
export function configured() {
  if (localMode()) return true;
  return !!(process.env['SUPABASE_URL'] && process.env['SUPABASE_PUBLISHABLE_KEY']);
}
export async function serverClient() {
  if (localMode()) return localClient();
  if (!configured()) throw new Error('CONFIGURATION_REQUIRED');
  const store = await cookies();
  return createServerClient(
    process.env['SUPABASE_URL']!,
    process.env['SUPABASE_PUBLISHABLE_KEY']!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (values) => {
          for (const { name, value, options } of values)
            store.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: 'lax',
              secure: process.env['SITE_ORIGIN']?.startsWith('https:') ?? false,
              path: '/',
            });
        },
      },
    },
  );
}
