import { resolve } from 'node:path';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { searchChunks } from '@site/content/assistant';
import type { Post } from '@site/contracts';

const model = 'Xenova/multilingual-e5-small';
const root = process.env['PROJECT_ROOT'] ?? resolve(process.cwd(), '../..');
const directory = resolve(root, '.local/search');
type Extractor = (
  text: string,
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<{ data: ArrayLike<number> }>;
type Index = { version: number; model: string; vectors: Record<string, number[]> };
type State = {
  extractor?: Promise<Extractor>;
  index?: Index;
  serial: Promise<unknown>;
  retryAfter: number;
  pending: number;
};
const global = globalThis as typeof globalThis & { rozanehSearch?: State };
const state = (global.rozanehSearch ??= { serial: Promise.resolve(), retryAfter: 0, pending: 0 });
state.pending ??= 0;
const fingerprint = (text: string) =>
  createHash('sha256').update(`${model}:q8:v1:${text}`).digest('hex');

export async function loadSearchModel(download = false) {
  if (!state.extractor) {
    state.extractor = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.cacheDir = resolve(directory, 'models');
      env.allowRemoteModels = download;
      return (await pipeline('feature-extraction', model, {
        dtype: 'q8',
        device: 'cpu',
        local_files_only: !download,
      })) as unknown as Extractor;
    })().catch((error) => {
      delete state.extractor;
      throw error;
    });
  }
  return state.extractor;
}
async function readIndex() {
  if (!state.index) {
    try {
      const value = JSON.parse(await readFile(resolve(directory, 'index.json'), 'utf8')) as Index;
      if (value.version !== 1 || value.model !== model || !value.vectors)
        throw new Error('Old index');
      state.index = value;
    } catch {
      state.index = { version: 1, model, vectors: {} };
    }
  }
  return state.index;
}
async function indexPosts(posts: Post[], download: boolean) {
  const extractor = await loadSearchModel(download),
    index = await readIndex();
  const vectors: Record<string, number[]> = {};
  for (const chunk of searchChunks(posts)) {
    const input = `passage: ${chunk.post.title}\n${chunk.post.topic}\n${chunk.text}`;
    const key = fingerprint(input);
    vectors[key] =
      index.vectors[key] ??
      Array.from((await extractor(input, { pooling: 'mean', normalize: true })).data);
  }
  if (
    Object.keys(vectors).some((k) => !index.vectors[k]) ||
    Object.keys(vectors).length !== Object.keys(index.vectors).length
  ) {
    state.index = { version: 1, model, vectors };
    await mkdir(directory, { recursive: true });
    const temporary = resolve(directory, `index-${process.pid}.tmp`);
    await writeFile(temporary, JSON.stringify(state.index));
    await rename(temporary, resolve(directory, 'index.json'));
  }
  return { extractor, vectors };
}
export async function prepareSearch(posts: Post[], download = false) {
  const work = state.serial.then(() => indexPosts(posts, download));
  state.serial = work.catch(() => undefined);
  return work;
}
export async function semanticScores(
  posts: Post[],
  query: string,
): Promise<Record<string, number> | null> {
  if (Date.now() < state.retryAfter || state.pending >= 2) return null;
  state.pending++;
  const work = state.serial
    .then(async () => {
      const { extractor, vectors } = await indexPosts(posts, false);
      const vector = Array.from(
        (await extractor(`query: ${query}`, { pooling: 'mean', normalize: true })).data,
      );
      return Object.fromEntries(
        searchChunks(posts).map((chunk) => {
          const input = `passage: ${chunk.post.title}\n${chunk.post.topic}\n${chunk.text}`;
          const target = vectors[fingerprint(input)]!;
          return [chunk.key, target.reduce((sum, value, i) => sum + value * (vector[i] ?? 0), 0)];
        }),
      );
    })
    .finally(() => {
      state.pending--;
    });
  state.serial = work.catch(() => undefined);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<null>((resolveTimeout) => {
        timer = setTimeout(() => resolveTimeout(null), 8000);
      }),
    ]);
  } catch {
    state.retryAfter = Date.now() + 60000;
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
