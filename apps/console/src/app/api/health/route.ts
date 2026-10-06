import { configured, localMode } from '../../../lib/supabase';
export function GET() {
  return Response.json(
    {
      service: 'console',
      authentication: localMode()
        ? 'local-postgresql'
        : configured()
          ? 'supabase'
          : 'configuration-required',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
