# آزمون، انتشار و نگهداری

## لایه‌های آزمون

- **مدل و ابزار import:** schema معتبر/نامعتبر، UTF-8، surrogate/emoji، Persian/Arabic digits، نیم‌فاصله، ID دارای صفر، file hash، resume، rerun، تغییر فایل، equality خام، candidate ranking، header بدون شماره و تعارض. property test: concatenation بلوک‌ها برابر original_text.
- **DB:** migrations از صفر، grants و RLS روی select/insert/update/delete برای anon، دو member، editor، moderator و admin؛ constraint پاسخ؛ atomic publish؛ concurrency با revision قدیمی؛ مجوز EXECUTE در RPC. اجرای محلی `supabase test db`، review policyها و سناریوی مستقیم PostgREST.
- **BFF و UI:** callback و چند cookie، link منقضی، حدس ID دیگر، CSRF، محدودیت body، CSP/XSS در متن، escape HTML، retry و خطای شبکه؛ فرم و دیدگاه؛ empty/loading/error/success.
- **E2E:** guest از خانه تا completion صریح و next؛ بازگشت scroll؛ sign-in بین `/app` و Astro؛ bookmark و progress در دو حساب و دو context browser؛ merge با replay؛ editor draft/preview و deny publish؛ admin publish/unpublish و تازه‌شدن search/sitemap؛ moderator approval/report؛ mobile menu و keyboard.
- **دسترس‌پذیری:** axe automated کمک‌کننده است نه گواهی؛ audit دستی RTL با NVDA و صفحه‌کلید، focus order، zoom 200٪، فونت بزرگ، dark، reduced motion، contrast و label. مستندات محتوای واقعیِ نقل عربی و emoji نیز خوانده شوند.
- **اعتماد داده:** checksum اصل، تعداد sourceها، هیچ اتکایی به `captured_order`، جست‌وجو فقط projection، zero impossible timestamps، diffs متن و publication sample توسط editor.

آزمون‌های authorization صریحاً اثبات کنند: کاربر A نمی‌تواند history/progress/bookmark/comment/report کاربر B را بخواند یا تغییر دهد؛ editor نمی‌تواند منتشر کند یا role اعطا کند؛ moderator نمی‌تواند مدیریت کاربر یا خواندن تاریخچه انجام دهد؛ anon نمی‌تواند draft یا pending بخواند؛ BFF admin route را با دست‌کاری payload و درخواست مستقیم DB نمی‌توان دور زد. پاسخ 404 برای resource خصوصی نیز می‌تواند شناسه را پنهان کند، ولی انتظار ثابت باید مستند باشد.

## معیارهای سنجش

اندازه‌گیری در موبایل میان‌رده، viewport 390×844، network profile حدود 1.6Mbps down/750Kbps up و RTT 150ms، پنج بار با cache سرد، در صفحه خانه و دو نمونه مطلب پس از content sign-off انجام شود؛ median و p75 گزارش شوند.

هدف: LCP p75 ≤ 2.5s، INP ≤ 200ms برای تعامل‌های خواندن، CLS ≤ 0.1؛ HTML first response p75 ≤ 800ms در همان region/پروفایل؛ JS اولیه عمومی ≤ 120KB gzip؛ جست‌وجوی عمومی p95 ≤ 700ms با 200 concurrent synthetic sessions روی dataset نمایشی هم‌اندازه هدف ۲ برابر 154 رکورد. این اعداد فرضیه هدف‌اند و باید پس از محیط staging اصلاح شوند، نه ادعای کارایی فعلی.

Lighthouse mobile برای baseline، WebPageTest یا Playwright trace برای waterfall، query log و `EXPLAIN ANALYZE` برای DB، web-vitals جمعی برای تولید. telemetry فاقد user ID پایدار است؛ IP کامل در analytics نگهداری نمی‌شود؛ sample محدود و retention پیشنهادی ۳۰ روز.

## انتشار و بازگشت

محیط local از Supabase CLI/DB محلی و seed ساختگی استفاده می‌کند. متغیرها در `.env.local` و secret manager محیط هستند؛ `.env.example` هیچ secret ندارد. migrations فقط additive تا پنجره حذف ستون؛ staging از backup data پاک‌شده/تأییدشده. کلید production و seed admin در log یا artifact قرار نمی‌گیرند.

build Astro و Next از lockfile واحد و Node version دقیق؛ gateway route test در pipeline؛ asset paths و redirectهای login با smoke test. migration پیش از deploy برنامه، جز در قرارداد expand/contract؛ backup پیش از تغییر پرریسک. قابلیت route maintenance برای `/app/admin` در صورت outage، صفحات عمومی خطای کنترل‌شده با request ID.

Supabase/hosting/image CDN ارائه‌دهنده نهایی نیازمند مالکیت حساب پروژه، منطقه داده، SLA/سیاست نگهداری و امکان export است. پیشنهاد اولیه منطقه نزدیک مخاطبان پس از بررسی latency و الزامات حقوقی است؛ نمی‌توان منطقه را از متن داده حدس زد. storage و DB backup، frequency و PITR طبق پلن واقعی تأییدشده؛ روزانه حداقل، RPO/RTO هدف‌گذاری و restore دوره‌ای. dependencyهای پلتفرمی ثبت می‌شوند و dump PostgreSQL و خروجی object inventory قابل خروج است.

مانیتور: HTTP 5xx، failed login در aggregate، latency/p95 query، فضای ذخیره‌سازی، backup result، queue دیدگاه و error rate SSR؛ اعلان فقط به owner. لاگ بدون متن کامل، گذرواژه، token، email در URL یا مطالعه کاربر. runbook: خطای Auth، leak احتمالی، database restore، storage recovery، deploy rollback و unpublish اضطراری. دسترسی admin حداقلی و audit قابل نگهداری.

## معیار آزادسازی

محتوا و مالک حقوق/اجازه انتشار آن تأیید شود؛ policy حریم خصوصی و حذف حساب واقعی باشد؛ auth email/reset روی دامنه کار کند؛ backup restore و rollback انجام شده باشد؛ test matrices اجرا شوند؛ آزمون استفاده با موبایل انجام شود؛ نمودار اندازه‌گیری به دست آید. بدون rubric Gemini، snapshotهای same-data و commit، نتایج آزمون و review مستقل نشان داده می‌شوند. به امتیاز فرضی تعهد داده نمی‌شود.
