import { z } from 'zod';

export { z };

export const collectionSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  subtitle: z.string(),
  accent: z.string().regex(/^#[0-9a-f]{6}$/i),
  description: z.string(),
});

export const postSchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  originalText: z.string().min(1),
  sourceIds: z.array(z.string()).min(1),
  dataset: z.string(),
  collectionSlug: z.string().nullable(),
  episodeNumber: z.number().int().positive().nullable(),
  readingOrder: z.number().int().positive().nullable(),
  topic: z.string(),
  cover: z.enum(['care', 'growth', 'prayer', 'tears']),
  sourcePublishedAt: z.null(),
  editorialStatus: z.enum(['preview', 'published']),
});

export const catalogSchema = z.object({ version: z.literal(1), collections: z.array(collectionSchema), posts: z.array(postSchema) });
export type Collection = z.infer<typeof collectionSchema>;
export type Post = z.infer<typeof postSchema>;
export type Catalog = z.infer<typeof catalogSchema>;
