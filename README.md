# روزنه — راهنمای اجرای محلی

این راهنما توضیح می‌دهد چگونه سایت را از صفر روی یک کامپیوتر جدید اجرا کنید. پس از پایان مراحل، سایت در این نشانی باز می‌شود:

```text
http://localhost:3000
```

## پیش‌نیازها

این سه برنامه را نصب کنید:

1. **Git** برای دریافت پروژه
   - دانلود: <https://git-scm.com/downloads>
   - پس از نصب، PowerShell را باز کنید و اجرا کنید:

     ```powershell
     git --version
     ```

2. **Node.js نسخهٔ 20.19 یا جدیدتر**
   - نسخهٔ LTS را از <https://nodejs.org/> دانلود کنید.
   - سپس PowerShell را ببندید و دوباره باز کنید و اجرا کنید:

     ```powershell
     node --version
     ```

3. **pnpm** برای نصب کتابخانه‌های پروژه
   - همراه Node.js نصب می‌شود و با Corepack فعال می‌گردد:

     ```powershell
     corepack enable
     corepack prepare pnpm@10.12.1 --activate
     pnpm --version
     ```

> اگر دستور `corepack` پیدا نشد، Node.js را به نسخهٔ جدید LTS ارتقا دهید.

## دریافت پروژه

در PowerShell، به پوشه‌ای بروید که می‌خواهید پروژه در آن قرار بگیرد؛ برای نمونه:

```powershell
cd D:\Website
```

سپس پروژه را دریافت کنید:

```powershell
git clone https://github.com/Amir-Hossein-Nil/rozaneh-reading-site.git
cd rozaneh-reading-site
```

## نصب وابستگی‌ها

در همان پوشهٔ پروژه اجرا کنید:

```powershell
pnpm install --frozen-lockfile
```

این مرحله فقط بار اول، یا بعد از تغییر وابستگی‌ها، لازم است. فایل `node_modules` ساخته می‌شود؛ این فایل‌ها در GitHub قرار ندارند، چون قابل نصب و بسیار حجیم‌اند.

## اجرای سایت

برای اجرای نسخهٔ توسعه:

```powershell
pnpm dev
```

وقتی پیام آماده‌بودن سرور را دیدید، مرورگر را باز کنید و به این نشانی بروید:

```text
http://localhost:3000
```

برای متوقف‌کردن سرور، در همان PowerShell کلیدهای `Ctrl + C` را بزنید.

## ساخت نسخهٔ production

برای بررسی اینکه سایت قابل build شدن است:

```powershell
pnpm build
```

و برای اجرای خروجی build‌شده روی پورت ۳۰۰۰:

```powershell
pnpm start
```

## دستورهای مفید

```powershell
# بررسی TypeScript و ساختار Astro
pnpm check

# دریافت آخرین تغییرات مخزن
git pull
```

## محتوای موجود در این مخزن

این نسخه، Reader عمومی سایت را با محتوای نمونه اجرا می‌کند. موارد زیر عمداً داخل GitHub نیستند:

- `node_modules`، چون با `pnpm install` ساخته می‌شود.
- `.local`، چون ممکن است شامل داده‌ها و اطلاعات محلی خصوصی باشد.
- مدل و ایندکس AI محلی، چون برای اجرای عمومی Reader لازم نیستند و حجم زیادی دارند.
- داده‌های خصوصی، اطلاعات حساب‌ها و پیکربندی‌های حساس.

اگر اجرای دستورها خطا داد، ابتدا مطمئن شوید در پوشهٔ `rozaneh-reading-site` هستید و نسخهٔ Node.js شما حداقل 20.19 است.
