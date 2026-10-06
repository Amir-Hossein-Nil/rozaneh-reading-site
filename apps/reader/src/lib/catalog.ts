import { getCatalog } from '@site/data-public';
export function loadCatalog() {
  const mode =
    import.meta.env['CONTENT_MODE'] ?? (import.meta.env.DEV ? 'preview' : 'unconfigured');
  return getCatalog({
    mode,
    url: import.meta.env['SUPABASE_URL'],
    key: import.meta.env['SUPABASE_PUBLISHABLE_KEY'],
    localURL: process.env['LOCAL_CONTENT_URL'] ?? import.meta.env['LOCAL_CONTENT_URL'],
  });
}
