import type { Post } from '@site/contracts';
import { readingMinutes } from '@site/content';

// Curated from the full texts; collection membership does not determine a path.
export const readingPathDefinitions = [
  {
    slug: 'awakened-conscience',
    title: 'بیداری عقل و وجدان',
    description: 'پنج نگاه به شناختی که از درون آغاز می‌شود؛ از فطرت تا صدای وجدان و بیداری دل.',
    accent: '#55b99b',
    symbol: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM16 8l-2.5 5.5L8 16l2.5-5.5L16 8Z',
    steps: [
      { slug: 'clear-beliefs-message-0144', note: 'فطرت، نقطه‌ی شروع فهم و شناخت است.' },
      {
        slug: 'clear-beliefs-message-0155',
        note: 'شناخت می‌تواند بیدار کردن چیزی باشد که از پیش درون ماست.',
      },
      { slug: 'clear-beliefs-message-0200', note: 'نسبت استدلال با معرفت وجدانی را بررسی کن.' },
      {
        slug: 'philosophy-of-tears-message-0177',
        note: 'گاهی احساس و اشک، راهی برای شناخت می‌شوند.',
      },
      {
        slug: 'philosophy-of-tears-message-0169',
        note: 'زنده بودن وجدان، امکان بازگشت و تغییر را حفظ می‌کند.',
      },
    ],
  },
  {
    slug: 'care-for-yourself',
    title: 'مراقبت از خویشتن',
    description:
      'از مدیریت میل و ورودی‌های ذهن تا مهار واکنش‌ها؛ پنج مطلب درباره انتخاب آگاهانه رفتار.',
    accent: '#e4a279',
    symbol: 'M5 19c0-6 5-9 12-12M5 16C1 8 9 3 21 3c0 12-5 20-13 16M10 12l1 5M14 9l-4-1',
    steps: [
      { slug: 'clear-beliefs-message-0014', note: 'تقوا را به‌عنوان مدیریت آگاهانه میل‌ها بشناس.' },
      {
        slug: 'clear-beliefs-message-0244',
        note: 'آنچه می‌بینی و می‌شنوی، در ساختن شخصیتت نقش دارد.',
      },
      { slug: 'life-with-ali-message-0154', note: 'در لحظه خشم، اختیار واکنش خود را نگه دار.' },
      {
        slug: 'life-with-ali-message-0253',
        note: 'مکث پیش از عمل، از خطا و پشیمانی جلوگیری می‌کند.',
      },
      {
        slug: 'occasions-message-0241',
        note: 'این مراقبت را در رفتار روزمره و رابطه با دیگران بیازما.',
      },
    ],
  },
  {
    slug: 'growth-through-hardship',
    title: 'رشد در دل سختی',
    description: 'پنج تأمل درباره مواجهه با رنج؛ شناخت خود، صبوری و یافتن معنا در روزهای دشوار.',
    accent: '#b9a2ed',
    symbol: 'M12 3C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-12ZM9 15a3 3 0 0 0 3 3',
    steps: [
      {
        slug: 'clear-beliefs-message-0193',
        note: 'ارزش در رشدِ حاصل از سختی است، نه در طلب کردن گرفتاری.',
      },
      {
        slug: 'clear-beliefs-message-0008',
        note: 'سختی می‌تواند تصویر ما از خود و توانایی‌هایمان را روشن‌تر کند.',
      },
      {
        slug: 'philosophy-of-tears-message-0163',
        note: 'به‌جای کنار زدن اندوه، با رنج روبه‌رو شو.',
      },
      {
        slug: 'life-with-ali-message-0047',
        note: 'صبوری، راه ادامه دادن در رابطه‌ها و مسیر رشد است.',
      },
      { slug: 'occasions-message-0183', note: 'از دل زخم و فقدان هم می‌توان به حمد و معنا رسید.' },
    ],
  },
  {
    slug: 'companionship-with-imam',
    title: 'رفاقت با امام',
    description:
      'پنج روایت از پیوندی فراتر از فاصله؛ حضور امام به‌عنوان همراه و پناه زندگی روزمره.',
    accent: '#70b9e1',
    symbol:
      'M8 3c-2 0-3 2-3 4v4c0 2 1 3 3 3s3-1 3-3V7c0-2-1-4-3-4ZM5 18a3 3 0 0 0 6 0v-1H5v1ZM17 7c-2 0-3 2-3 4v4c0 2 1 3 3 3s3-1 3-3v-4c0-2-1-4-3-4ZM14 22h6v-1h-6v1Z',
    steps: [
      { slug: 'everyday-life-message-0040', note: 'رفاقت و آرامش، به نزدیکی مکانی وابسته نیستند.' },
      {
        slug: 'his-footsteps-message-0002',
        note: 'در میان دلتنگی و فقدان، این پیوند می‌تواند خانه امن دل باشد.',
      },
      {
        slug: 'occasions-message-0219',
        note: 'کار روزانه هم می‌تواند بهانه‌ای برای رفاقت با امام شود.',
      },
      {
        slug: 'his-footsteps-message-0240',
        note: 'حس حضور را به معیاری برای تصمیم‌های زندگی تبدیل کن.',
      },
      {
        slug: 'his-footsteps-message-0252',
        note: 'با پذیرفتن مسئولیت انتخاب‌ها، این همراهی را حفظ کن.',
      },
    ],
  },
];

export function resolveReadingPaths(posts: Post[]) {
  const bySlug = new Map(posts.map((post) => [post.slug, post]));
  return readingPathDefinitions
    .map((path) => {
      const steps = path.steps.flatMap((step) => {
        const post = bySlug.get(step.slug);
        return post ? [{ post, note: step.note }] : [];
      });
      return {
        ...path,
        steps,
        minutes: steps.reduce((total, step) => total + readingMinutes(step.post.originalText), 0),
      };
    })
    .filter((path) => path.steps.length > 0);
}
