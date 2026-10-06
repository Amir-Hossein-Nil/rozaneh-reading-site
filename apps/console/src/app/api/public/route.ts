import { NextResponse } from 'next/server';
import { localMode } from '../../../lib/supabase';
import { queryAs } from '../../../lib/local-database';
import { catalogSchema } from '@site/contracts';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (!localMode()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const [posts, collections] = await Promise.all([
      queryAs(null, 'select payload from public.published_posts order by slug'),
      queryAs(null, 'select payload from public.published_collections order by slug'),
    ]);
    const catalog = catalogSchema.parse({
      version: 1,
      posts: posts.rows.map((r) => r['payload']),
      collections: collections.rows.map((r) => r['payload']),
    });
    return NextResponse.json(catalog, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Content unavailable' }, { status: 503 });
  }
}
