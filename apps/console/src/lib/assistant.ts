import { rankAssistant } from '@site/content/assistant';
import { postSchema, collectionSchema, z } from '@site/contracts';
import { semanticScores } from './search-model';
import { serverClient } from './supabase';

const input = z.object({
  query: z.string().trim().max(250).default(''),
  collection: z
    .string()
    .regex(/^[a-z0-9-]*$/)
    .default(''),
});
let running = 0;
export async function assistantSearch(query: string, collection: string) {
  const value = input.parse({ query, collection });
  const db = await serverClient();
  const [p, c] = await Promise.all([
    db.from('published_posts').select('payload'),
    db.from('published_collections').select('payload'),
  ]);
  if (p.error || c.error) throw new Error('Catalog unavailable');
  const posts = (p.data ?? []).map((r) => postSchema.parse(r.payload));
  const collections = (c.data ?? []).map((r) => collectionSchema.parse(r.payload));
  let scores: Record<string, number> | null = null;
  if (value.query && running < 2) {
    running++;
    try {
      scores = await semanticScores(posts, value.query);
    } finally {
      running--;
    }
  }
  // Rank only the live public projection, even if old vectors remain on disk.
  return {
    mode: scores ? 'hybrid' : 'lexical',
    results: value.query
      ? rankAssistant(
          posts.filter((p) => !value.collection || p.collectionSlug === value.collection),
          value.query,
          scores ?? {},
        )
      : [],
    collections: collections.map((c) => ({ slug: c.slug, title: c.title })),
  };
}
