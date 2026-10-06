# نقشه راه مرحله‌ای

برآورد ظرفیت تقریبی تیم دو نفره (توسعه و طراحی/تحریریه) برای برنامه‌ریزی است؛ وابسته به تأیید hosting، طراحی و آماده‌بودن حساب Supabase است و وعده تقویمی نیست.

## فاز صفر: زیرساخت تصمیم و طراحی

**هدف:** ثابت‌کردن مسیرهای پرریسک پیش از توسعه گسترده. **وابستگی:** تأیید این طرح؛ دسترسی به سرویس و دامنه هنوز لازم نیست.

**کارها:** انتخاب نمونه‌های source برای صفحه اصلی، مطلب بلند، شماره متعارض و مطلب بدون متن کامل؛ طراحی موبایل/دسکتاپ و حالت تاریک؛ آزمون کوتاه با ۳ تا ۵ خواننده و یک ویرایشگر؛ بررسی نسخه جاری Astro/Next/React و سازگاری gateway/Node/Supabase، ناحیه داده، هزینه و محدودیت‌ها؛ ADR برای روش نشست، مسیر deploy، دسترسی و fonts/assets.

**تحویل:** prototypeهای بازبینی‌شده، فهرست تصمیم‌های بسته/باز، ماتریس سازگاری و فایل‌های واقعی فونت با مجوز. **پذیرش:** مسیر صفحه اصلی→مجموعه→مطلب→بعدی روی موبایل قابل انجام است؛ WCAG contrast در tokenها بررسی شده؛ `/app` و assetها از gateway نمونه به برنامه درست می‌رسند؛ callback cookie میان دو برنامه طرح اجرایی دارد. اگر سازگاری مسیر یا hosting اثبات نشود، دامنه به یک Next واحد با Astro صرفاً برای تولید استاتیک/ساخت محتوا بازنگری می‌شود.

## فاز یک: برش کوچک end-to-end

**هدف:** اثبات یک قطعه واقعی از هر دو برنامه با هویت و مجوز، پیش از گسترش دامنه. **وابستگی:** فاز صفر و یک محیط staging.

**کارها:** workspace و lockfile و lint/typecheck؛ یک migration برای مجموعه، یک مطلب، projection عمومی و profile؛ demo data ساختگی؛ صفحه Astro مجموعه/مطلب و RTL؛ Next sign-up/sign-in/callback/sign-out؛ route `/app/api/session`؛ نشانک یک‌مطلبی با RLS؛ gateway یک‌دامنه؛ یک آزمون Playwright ورود و رفت‌وآمد مسیرها، و آزمون SQL مالکیت نشانک. هیچ import واقعی‌ای در این فاز منتشر نمی‌شود.

**تحویل:** یک vertical slice قابل deploy و ADR به‌روز. **پذیرش:** درخواست anon فقط مطلب published را می‌خواند؛ preview/draft 404 است؛ دو کاربر نمی‌توانند نشانک دیگری را ببینند/تغییر دهند؛ پس از ورود به `/app` با همان origin کاربر در Astro signed-in شناخته می‌شود؛ خروج نشست را باطل می‌کند؛ ثبات build/runtime در local و staging تأیید می‌شود؛ در viewport 390px clipping ندارد. شکست هر معیار، توقف گسترش featureها تا رفع علت است.

## فاز دو: بنیان محتوا و مهاجرت آزمایشی

**هدف:** source immutable و ابزار بررسی قابل استفاده برای سردبیر. **وابستگی:** فاز یک، تصمیم retention و دسترسی import.

**کارها:** migration source/version/review/duplicate/audit؛ schema adapters جدا برای envelope اصلی و آرایه مکمل؛ hash و dry-run و restart؛ تشخیص exact و near duplicate؛ پنل diff و flags؛ پیشنهاد عنوان/مجموعه/شماره و reorder قابل دسترس؛ draft، preview و revision control.

**تحویل:** اجرای import روی هر دو فایل در محیط private/staging، گزارش خطا و راهنمای کار سردبیر. **پذیرش:** rerun رکورد اضافه نمی‌سازد؛ هر متن و source ID بازیابی می‌شود؛ تکرار دقیق خودکار merge نمی‌شود؛ تعارض‌های اپیزودی و رکورد بدون عدد مانع انتشار تا تصمیم مدیرند؛ run دوم schema که ID مشترک دارد به run اول وصل نمی‌شود؛ متن preview با متن منبع قابل تطبیق است. دست‌کم یک editor همه دسته‌های exception را مرور می‌کند.

## فاز سه: خواندن عمومی و مرور محتوا

**هدف:** ارائه مسیر کامل مطالعه بدون حساب. **وابستگی:** حداقل یک batch محتوای editorially approved؛ فونت و assets.

**کارها:** خانه، مجموعه، متن، topic، search، sitemap عمومی؛ ایندکس و نرمال‌سازی مشتق‌شده؛ pagination، 404، رفع انتشار؛ theme/typography و کمینه جزیره‌های progress/bookmark مهمان؛ مرور تلفن و contrast با محتوای واقعی.

**تحویل:** بخش عمومی آماده آزمون پذیرش. **پذیرش:** navigation فقط reading order تصویب‌شده را می‌پیماید؛ خروجی search شکل/حروف نرمال‌شده را پیدا می‌کند و اصل متن را تغییر نمی‌دهد؛ بازدید ساده complete نمی‌سازد؛ متن قبل از hydrate قابل خواندن است؛ title و canonical فقط public هستند؛ unread/completed/empty/error قابل دسترس‌اند.

## فاز چهار: حساب و همگام‌سازی

**هدف:** چرخه حساب و داده بین دستگاه. **وابستگی:** فاز یک RLS و فاز سه مدل progress.

**کارها:** ثبت، تأیید، بازیابی، تغییر گذرواژه و پروفایل؛ dashboard/history/bookmark/comment list؛ merge مهمان اقدام‌محور؛ conflict control/versioning؛ export/delete حساب و حذف cache هنگام sign-out.

**تحویل:** آزمون دو دستگاه و سیاست نگهداری/حذف. **پذیرش:** guest و عضو بدون اختلاط namespace؛ idempotent merge؛ request stale با 409؛ هیچ تاریخچه یا bookmark از API به کاربر دیگر نمی‌رسد؛ حذف حساب با رفتار وابستگی‌ها و Auth account هم‌راستاست.

## فاز پنج: دیدگاه و مدیریت تکمیل‌شده

**هدف:** انتشار محتوای روزمره و تعامل تعدیل‌شده. **وابستگی:** نقش admin و RLS، فهرست ادمین bootstrap، policy و abuse limits.

**کارها:** workflow و role check؛ ویرایش metadata و format؛ مدیریت تصاویر/ترتیب/موضوع؛ مدیریت کاربران حداقلی؛ آمار تجمیعی؛ دیدگاه/پاسخ/گزارش و صف تعدیل؛ audit و backup/restore rehearsal.

**تحویل:** راهنمای مدیر و ممیزی permission. **پذیرش:** editor قادر به publish نیست؛ moderator قادر به تغییر role یا دیدن progress خصوصی نیست؛ admin تنها role manager است؛ ریشه/پاسخ میان‌مطلب رد می‌شود؛ pending عمومی نیست؛ انتشار/لغو/restore در transaction و با audit صورت می‌گیرد؛ upload فاقد alt/مجوز رد می‌شود.

## فاز شش: سخت‌سازی و انتشار

**هدف:** اطمینان از عملکرد و عملیات پیش از دامنه عمومی. **وابستگی:** همه فازها و مالک hosting.

**کارها:** سناریوی staging از DB خالی تا deploy؛ DAST محدود، headers، rate limit، keyboard/screen reader، Lighthouse و performance traces؛ آزمایش restore؛ runbook incident و rollback؛ content sign-off و privacy/security review.

**تحویل:** release candidate، گزارش KPI baseline و sign-off. **پذیرش:** خطاهای P0/P1 بسته؛ migration از صفر و backup restore آزمایش شده؛ معیارهای آزمون سند ۷ پاس؛ cookie، preview، unpublish، sitemap و redirects دامنه نهایی تأیید شده؛ owner می‌داند چگونه انتشار را متوقف و نسخه قبلی را برگرداند.

## وابستگی اجرایی مهم

محتوا به design sample و سپس import نیاز دارد؛ migration دیتابیس پیش از import UI لازم است؛ role و RLS پیش از هر BFF write؛ route gateway پیش از آزمون session میان برنامه‌ها؛ policy دیدگاه پیش از بازکردن فرم. تغییر این ترتیب موجب بازکاری در مدل data و session می‌شود.
