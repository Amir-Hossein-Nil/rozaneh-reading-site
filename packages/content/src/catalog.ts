import { catalogSchema } from '@site/contracts';

/** Small public fixture used only when a local content service is not configured. */
export const previewCatalog = catalogSchema.parse({
  version: 1,
  collections: [{ slug: 'clear-beliefs', title: 'اعتقادات روشن', subtitle: 'پرسش‌هایی برای روشن‌تر دیدن', accent: '#55b99b', description: 'نگاهی به باورها، معرفت و انتخاب‌های روزمره.' }],
  posts: [{ id: 'preview-001', slug: 'care-or-limitation', title: 'تقوا؛ محدودیت یا مراقبت؟', originalText: '💠 اعتقادات روشن برای عصر ما\n\nوقتی از «نباید»های دینی حرف می‌زنیم، شاید در ابتدا آن‌ها را محدودیت ببینیم. اما می‌شود از زاویه‌ای دیگر نگاه کرد: ورودی‌های زندگی ما، آرام‌آرام نگاه و انتخاب‌های ما را می‌سازند.\n\n👀 آنچه می‌بینیم، می‌شنویم و با آن معاشرت می‌کنیم، بی‌اثر نمی‌ماند. مراقبت آگاهانه از این ورودی‌ها، نه نفی اختیار، بلکه محافظت از چیزی است که قرار است از ما ساخته شود.\n\n🌿 تقوا یعنی با توجه انتخاب کنیم که چه چیزی را به ذهن و دل خود راه می‌دهیم.', sourceIds: ['preview-001'], dataset: 'preview', collectionSlug: 'clear-beliefs', episodeNumber: 1, readingOrder: 1, topic: 'اخلاق', cover: 'care', sourcePublishedAt: null, editorialStatus: 'published' }]
});
