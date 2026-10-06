# مدل داده و امنیت

## موجودیت‌ها

همه شناسه‌های داخلی UUID هستند. زمان‌های ایجاد و تغییر، زمان واقعی سامانه با UTC هستند؛ هیچ‌کدام جای تاریخ نامعلوم پیام اصلی را نمی‌گیرند.

| موجودیت | فیلدها و رابطه‌های اصلی | قیود و دسترسی |
|---|---|---|
| `auth.users` | هویت Supabase | تنها مرجع شناسه کاربر |
| `profiles` | `user_id`, `display_name`, preferences | مالک؛ نمایش عمومی فقط نام مستعار کنار دیدگاه، نه ایمیل یا profile کامل |
| `user_roles` | `user_id`, `role`, `active` | فقط مدیر مجاز؛ غیرقابل تغییر توسط profile update |
| `source_datasets` | namespace، نام منبع، schema version | دو فایل فعلاً دو namespace مستقل |
| `import_runs` | dataset، file SHA-256، parser version، وضعیت و شمارش | unique روی dataset/file hash/parser version؛ خصوصی تحریریه |
| `source_records` | dataset، `external_id` دقیق، capture order | unique روی `(dataset_id, external_id)`؛ صفرهای ID حفظ می‌شوند |
| `source_record_versions` | record، raw JSON، `original_text`, text hash، `raw_time` | immutable؛ unique روی record/payload hash؛ اصل فایل نیز خصوصی بایگانی می‌شود |
| `import_run_records` | run، source version، نتیجه | نسبت ورود مجدد به همان نسخه، بدون ساخت رکورد اضافه |
| `review_items` | نسخه منبع، پیشنهاد title/type/collection/episode، confidence، flags، status | پیشنهاد قابل رد؛ عمومی نیست |
| `duplicate_candidates` | دو source version، روش، score، تصمیم و دلیل | جفت مرتب‌شده unique؛ تصمیم انسانی ثبت می‌شود |
| `posts` | slug پایدار، وضعیت، working/published revision، زمان‌های سامانه | slug unique؛ حذف سخت برای مطلب منتشرشده ممنوع |
| `post_sources` | post، source version، نقش canonical/duplicate/context | چند منبع به یک مطلب؛ هیچ منبع حذف نمی‌شود |
| `post_revisions` | post، title، safe blocks، kind، author، change note | نسخه immutable؛ مقایسه نسخه‌ها؛ `source_published_at` nullable با مدرک |
| `collections` | slug، نام نمایشی، aliases، توضیح، accent، cover، entry post | aliases نام‌های مختلف را به یک هویت وصل می‌کنند |
| `collection_entries` | collection، post، episode number nullable، episode label اصلی، reading order، نوع entry | یک مجموعه اصلی برای هر post در v1؛ شماره با ترتیب فرق دارد |
| `topics`, `post_topics` | عنوان/slug موضوع و اتصال چندبه‌چند | slug و جفت ارتباط unique |
| `media_assets` | storage key، ابعاد، MIME، alt، rights، وضعیت | اصل خصوصی؛ نسخه عمومی تأییدشده |
| `published_posts` | projection کامل و امن از revision منتشرشده، search text | فقط RPC انتشار می‌نویسد؛ anon فقط SELECT |
| `published_collections`, `published_entries`, `published_post_topics` | projection عمومی وابستگی‌های مطلب | تغییر هم‌زمان در تراکنش انتشار؛ بدون اطلاعات draft |
| `reading_progress` | user، post، state، anchor، offset، revision، version، updated_at | unique `(user_id,post_id)`؛ فقط مالک |
| `bookmarks` | user، post، created_at | unique `(user_id,post_id)`؛ فقط مالک |
| `comments` | post، user، parent nullable، plain text، status، timestamps، version | parent از همان post و فقط ریشه؛ مالک + moderator طبق قواعد پایین |
| `comment_reports` | comment، reporter، reason، state | یک گزارش فعال از هر کاربر برای هر دیدگاه؛ فقط گزارش‌دهنده و moderator |
| `audit_events` | actor، action، target، زمان و خلاصه تغییر | append-only؛ بدون token، گذرواژه یا تاریخچه مطالعه |
| `daily_content_stats` | day، post، شمارش شروع/تکمیل/بازدید تقریبی | بدون user_id؛ دسترسی گزارش مدیریتی |

خود `review_items` محل تعارض است، نه قید یکتایی قسمت. روی membership تأییدشده، `(collection_id, reading_order)` یکتا و شماره‌های غیرnull نیز در هر مجموعه یکتا هستند. مقدمه یا پیوست می‌تواند بدون شماره و با ترتیب صریح باشد. تعارض حل‌نشده اجازه انتشار در مسیر قسمت‌های شماره‌دار ندارد. اگر دو متن واقعاً متعلق به یک شماره باشند، مدیر باید آن‌ها را زیر یک قسمت یا یکی را به‌عنوان پیوست مستقل تنظیم کند و دلیل ثبت کند؛ شماره جدید خودکار ساخته نمی‌شود.

ایندکس‌ها: همه FKهای پرتکرار؛ source text hash؛ صف review بر status؛ membership بر collection/order؛ progress بر user/updated_at؛ bookmarks بر user/created_at؛ comments بر post/status/created_at و parent؛ reports بر state؛ جست‌وجو GIN/trigram روی متن مشتق‌شده و ایندکس title. ترتیب نتایج با tie-breaker پایدار ID و صفحه‌بندی محدود است.

## چرخه محتوا

صف منبع: `unreviewed → needs_resolution | accepted | excluded`. علت exclusion ثبت می‌شود و متن باقی می‌ماند. accepted فقط اجازه ایجاد پیش‌نویس می‌دهد.

چرخه مطلب: `draft → in_review → published → unpublished → archived`. بازگشت از review به draft و از unpublished به review ممکن است. بازیابی archived به draft با audit انجام می‌شود. انتشار صرفاً با نسخه معتبر، عنوان، slug، وضعیت حقوق انتشار، حل flags مسدودکننده و ترتیب تأییدشده مجاز است.

`posts.status=published` می‌تواند هم‌زمان working revision جدید داشته باشد. تغییر draft، نسخه زنده را عوض نمی‌کند. RPC انتشار با expected revision/version و تراکنش اجرا می‌شود؛ اگر دو مدیر هم‌زمان ذخیره کنند، نفر دوم تعارض قابل مشاهده می‌گیرد. unpublish projection عمومی را حذف می‌کند و ارتباط‌های عمومی، نتایج جست‌وجو و sitemap نیز در درخواست تازه حذف می‌شوند. نشانک و progress خصوصی باقی می‌مانند و فقط «این مطلب در دسترس نیست» نشان می‌دهند.

## نقش‌ها

| اقدام | مهمان | عضو | editor | moderator | admin |
|---|---|---|---|---|---|
| خواندن محتوای منتشرشده | بله | بله | بله | بله | بله |
| داده شخصی | فقط local دستگاه | فقط خود | فقط خود | فقط خود | فقط خود |
| دیدگاه/گزارش | خیر | خود | خود | خود | خود |
| واردسازی، عنوان، بلوک‌بندی، draft، preview | خیر | خیر | بله | خیر | بله |
| انتشار/لغو/آرشیو، تغییر ترتیب عمومی | خیر | خیر | خیر | خیر | بله |
| تعدیل دیدگاه و رسیدگی به گزارش | خیر | خیر | خیر | بله | بله |
| تغییر نقش، تعلیق کاربر، آمار تجمیعی | خیر | خیر | خیر | خیر | بله |

نقش‌ها می‌توانند ترکیب شوند. admin هم اجازه خواندن تاریخچه و نشانک خصوصی دیگران ندارد. مدیریت کاربران نام، وضعیت و داده لازم برای اداره حساب را نشان می‌دهد؛ فهرست علایق و مطالعات نمایش داده نمی‌شود. ساخت نخستین admin یک عملیات bootstrap ثبت‌شده است؛ فرم عمومی هیچ امکان self-promotion ندارد. حذف یا تنزل آخرین admin فعال ممنوع است.

## اجرای مجوز

هر درخواست Next هم session و هم permission را در سرور بررسی می‌کند. روی جداول exposed، grants حداقلی و RLS به‌صورت پیش‌فرض بسته برقرار است؛ `USING` و `WITH CHECK` برای مالکیت لازم‌اند. view پیش‌فرض ممکن است RLS را دور بزند، بنابراین projection عمومی مستقل یا view با `security_invoker` بررسی‌شده استفاده می‌شود. secret مدیریتی RLS را دور می‌زند و در مسیرهای معمول ممنوع است. [راهنمای RLS و grants](https://supabase.com/docs/guides/database/postgres/row-level-security)

RLS محدودیت سطر را اعمال می‌کند؛ تغییر ستون‌های حساس با grant ستون/RPC محدود و trigger کنترل می‌شود. برای انتشار، تغییر نقش، دیدگاه و گزارش، write مستقیم از API داده مسدود است و فقط RPCهای باریک با بررسی `auth.uid()`، نقش جاری، وضعیت حساب و قواعد انتقال اجرا می‌شوند. در تابع `security definer`، `search_path` ثابت، EXECUTE محدود و دسترسی صریح ضروری است. نباید بتوان BFF را دور زد و با Supabase API محدودیت تعدیل یا نرخ را دور زد.

درخواست‌های تغییردهنده GET نیستند؛ origin و CSRF token برای POST/PATCH/DELETE بررسی می‌شود. rate limit حساب/دیدگاه در DB نیز قابل اعمال است؛ خطای اعتبارسنجی 400، نبود هویت 401، مجوز ناکافی 403 و تعارض نسخه 409 دارد. UUID نقش رمز عبور ندارد. body و حجم upload محدود، متن خروجی escape، لینک‌ها فقط پروتکل‌های مجاز، CSP و headerهای امنیتی تنظیم می‌شوند.

## قواعد دیدگاه نسخه اول

متن ساده ۱ تا ۲۰۰۰ نویسه، بدون HTML و پیوست. حساب تأییدشده لازم است؛ همه ارسال‌ها `pending`، سپس `published` یا `rejected` می‌شوند. pending/rejected فقط برای نویسنده و moderator دیده می‌شوند. شمارنده عمومی فقط published را می‌شمارد.

یک سطح پاسخ: پاسخ فقط به دیدگاه ریشه منتشرشده در همان مطلب. ترتیب زمانی صعودی؛ صفحه‌بندی ریشه‌ها و تعداد محدود پاسخ. در ۱۵ دقیقه نخست و تا وقتی پاسخ منتشرشده ندارد، نویسنده می‌تواند متن را ویرایش کند؛ ویرایش دیدگاه published آن را به pending برمی‌گرداند. rejected قابل ویرایش نیست؛ ارسال جدید طبق rate limit ممکن است. moderator متن را به نام کاربر بازنویسی نمی‌کند.

نویسنده هر زمان می‌تواند دیدگاه خود را حذف کند: بدنه عمومی پاک و یک جای‌نگهدار برای حفظ رشته پاسخ‌ها باقی می‌ماند. رد یا حذف ریشه، پاسخ‌های قبلاً تأییدشده را با ریشه جای‌نگهدار نگه می‌دارد؛ هر پاسخ جداگانه قابل تعدیل است. علت رد خصوصی و audit محفوظ است؛ نگهداری نسخه حذف‌شده برای رسیدگی حداکثر ۳۰ روز، سپس پاک‌سازی طبق runbook.

گزارش با دلیل کوتاه، بدون افشای هویت گزارش‌دهنده به نویسنده. محدودیت اولیه پیشنهادی ۵ ارسال در ۱۰ دقیقه و ۲۰ ارسال در روز و ۱۰ گزارش در روز برای هر حساب؛ در DB و قابل تنظیم پس از پایلوت. محدودیت IP در gateway کوتاه‌مدت است؛ IP به آمار محتوا منتقل نمی‌شود. CAPTCHA فقط در صورت شواهد سوءاستفاده اضافه می‌شود.
