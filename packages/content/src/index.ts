import type { Post } from '@site/contracts';

export function normalizePersian(text: string) {
  return text.replace(/ي|ى/g, 'ی').replace(/ك/g, 'ک').replace(/[\u064B-\u065F\u0670]/g, '').replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g, c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/\u200c|\u200d|\u200e|\u200f/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}
export function readingMinutes(text: string) { return Math.max(1, Math.ceil(text.trim().split(/\s+/u).length / 180)); }
export function faNumber(value: number) { return value.toLocaleString('fa-IR'); }
export function searchPosts(posts: Post[], query: string, collection = '') { const tokens = normalizePersian(query).slice(0, 160).split(' ').filter(Boolean); return posts.filter(p => (!collection || p.collectionSlug === collection) && tokens.every(t => normalizePersian(`${p.title} ${p.topic} ${p.originalText}`).includes(t))); }
export function orderedEpisodes(posts: Post[], slug: string) { return posts.filter(p => p.collectionSlug === slug && p.readingOrder !== null).sort((a, b) => a.readingOrder! - b.readingOrder! || a.id.localeCompare(b.id)); }
export function presentationBlocks(text: string) { const boundaries = [...text.matchAll(/\p{Extended_Pictographic}/gu)].map(m => m.index!).filter(i => i > 0); const cuts = [0]; let last = 0; for (const index of boundaries) if (index - last >= 65) { cuts.push(index); last = index; } cuts.push(text.length); return cuts.slice(0, -1).map((start, i) => text.slice(start, cuts[i + 1])); }
