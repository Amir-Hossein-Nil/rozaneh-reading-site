import type { APIRoute } from 'astro';
import { loadCatalog } from '../lib/catalog';
export const GET: APIRoute = async () => {
  try {
    return new Response(JSON.stringify(await loadCatalog()), {
      headers: { 'Content-Type': 'application/json;charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Content unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
