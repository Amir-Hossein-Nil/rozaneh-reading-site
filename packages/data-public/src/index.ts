import { catalogSchema, type Catalog } from '@site/contracts';
import { previewCatalog } from '@site/content/catalog';

export async function getCatalog(config: { mode?: string; url?: string; key?: string; localURL?: string }): Promise<Catalog> {
  if (config.mode === 'local' && config.localURL) {
    try {
      const response = await fetch(config.localURL, { cache: 'no-store', signal: AbortSignal.timeout(5_000) });
      if (response.ok) return catalogSchema.parse(await response.json());
    } catch { /* The standalone reader intentionally falls back to its public fixture. */ }
  }
  return previewCatalog;
}
