'use client';
import { Children, useEffect, useId, useState, type ReactNode, type SubmitEvent } from 'react';
import { api, session, type Session } from '@site/ui/api';
import { z, catalogSchema, type Catalog } from '@site/contracts';
import { readStorage, updateStorage } from '@site/ui/storage';
const historySchema = z.object({
  bookmarks: z.array(z.object({ post_id: z.string() })),
  progress: z.array(
    z.object({
      post_id: z.string(),
      state: z.enum(['in_progress', 'completed']),
      position: z.coerce.number(),
      updated_at: z.string(),
    }),
  ),
});
function AccountList({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const items = Children.toArray(children);
  return (
    <>
      <div id={id}>{expanded ? items : items.slice(0, 5)}</div>
      {items.length > 5 && (
        <button
          type="button"
          className="quiet-button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'موارد کمتر' : 'موارد بیشتر'}
        </button>
      )}
    </>
  );
}
export function AccountPanel() {
  const [profile, setProfile] = useState<{
    profile: { display_name: string; preferences: { theme?: 'light' | 'dark'; fontSize?: number } };
    comments: { id: string; post_slug: string; body: string; status: string }[];
  } | null>(null);
  const [guestCount, setGuestCount] = useState(0);
  const [current, setCurrent] = useState<Session | null>(null);
  const [mode, setMode] = useState('signin');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [history, setHistory] = useState<z.infer<typeof historySchema> | null>(null);
  useEffect(() => {
    void session()
      .then(async (value) => {
        setCurrent(value);
        if (new URLSearchParams(location.search).has('recovery')) setMode('password');
        if (new URLSearchParams(location.search).has('authError'))
          setMessage('پیوند تأیید معتبر نیست؛ دوباره درخواست کنید.');
        if (value.user) {
          const [content, saved] = await Promise.all([
            fetch('/catalog.json', { cache: 'no-store' }).then((r) => r.json()),
            api('reader'),
          ]);
          setCatalog(catalogSchema.parse(content));
          setHistory(historySchema.parse(saved));
          const profileData = z
            .object({
              profile: z.object({
                display_name: z.string(),
                preferences: z.object({
                  theme: z.enum(['light', 'dark']).optional(),
                  fontSize: z.number().optional(),
                }),
              }),
              comments: z.array(
                z.object({
                  id: z.string(),
                  post_slug: z.string(),
                  body: z.string(),
                  status: z.string(),
                }),
              ),
            })
            .parse(await api('profile'));
          setProfile(profileData);
          const guest = readStorage();
          setGuestCount(guest.bookmarks.length + Object.keys(guest.progress).length);
        }
      })
      .catch(() => setMessage('بارگیری حساب انجام نشد؛ صفحه را تازه کنید.'));
  }, []);
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const result = z
        .object({ message: z.string().optional(), signedIn: z.boolean().optional() })
        .parse(
          await api('auth', {
            action: mode,
            email: form.get('email'),
            password: form.get('password'),
            displayName: form.get('name') ?? undefined,
          }),
        );
      setMessage(result.message ?? 'انجام شد.');
      if (result.signedIn || mode === 'password') location.assign('/app');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'عملیات انجام نشد.');
    } finally {
      setBusy(false);
    }
  }
  async function signout() {
    setBusy(true);
    try {
      await api('auth', { action: 'signout' });
      location.assign('/app');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'خروج انجام نشد.');
      setBusy(false);
    }
  }
  async function mergeGuest() {
    setBusy(true);
    try {
      const guest = readStorage();
      const available = new Set(catalog?.posts.map((p) => p.id));
      for (const id of guest.bookmarks) {
        if (available.has(id))
          await api('reader', { operation: 'bookmark', post: id, saved: true });
      }
      for (const [id, progress] of Object.entries(guest.progress)) {
        if (!available.has(id)) continue;
        const currentData = z
          .object({
            progress: z.array(
              z.object({ post_id: z.string(), version: z.number(), updated_at: z.string() }),
            ),
          })
          .parse(await api('reader'));
        const previous = currentData.progress.find((p) => p.post_id === id);
        if (previous && Date.parse(previous.updated_at) >= progress.updatedAt) continue;
        await api('reader', {
          operation: 'progress',
          post: id,
          state: progress.state,
          position: progress.position,
          anchor: progress.anchor ?? null,
          offset: progress.offset ?? 0,
          version: previous?.version ?? 0,
        });
      }
      updateStorage((previous) => ({
        ...previous,
        bookmarks: previous.bookmarks.filter((id) => !available.has(id)),
        progress: Object.fromEntries(
          Object.entries(previous.progress).filter(([id]) => !available.has(id)),
        ),
      }));
      location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'انتقال کامل نشد؛ دوباره امتحان کنید.');
      setBusy(false);
    }
  }
  if (!current)
    return (
      <section className="console-panel">
        <h1>حساب و مدیریت مطالب</h1>
        <p role="status">{message || 'در حال بررسی حساب…'}</p>
      </section>
    );
  const isRecovery = mode === 'password';
  if (!current.user || isRecovery)
    return (
      <section className="account-grid">
        <div className="account-intro">
          <span className="eyebrow">مسیر خودت را ادامه بده</span>
          <h1>حساب و مدیریت مطالب</h1>
          <p>مطالب مورد علاقه‌ات را نگه دار و از همان جایی که خواندن را متوقف کردی ادامه بده.</p>
          <a href="/" className="quiet-button">
            کشف مطالب
          </a>
        </div>
        <div className="console-panel">
          <h2>
            {mode === 'signup'
              ? 'ساخت حساب'
              : mode === 'recover'
                ? 'بازیابی حساب'
                : isRecovery
                  ? 'گذرواژه جدید'
                  : 'خوش برگشتی'}
          </h2>
          {!current.configured && (
            <p className="notice">
              همگام‌سازی حساب هنوز فعال نیست. مطالعه و ذخیره محلی در دسترس‌اند؛ ورود و همگام‌سازی پس
              از تنظیم اتصال فعال می‌شوند.
            </p>
          )}
          <form onSubmit={(e) => void submit(e)} className="stack-form">
            {mode === 'signup' && (
              <label>
                نام نمایشی
                <input name="name" required maxLength={60} autoComplete="nickname" />
              </label>
            )}
            {!isRecovery && (
              <label>
                ایمیل
                <input
                  name="email"
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              </label>
            )}
            {mode !== 'recover' && (
              <label>
                گذرواژه
                <input
                  name="password"
                  type="password"
                  aria-label="گذرواژه"
                  aria-describedby="password-hint"
                  dir="ltr"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  minLength={10}
                  maxLength={128}
                  required
                />
                <small id="password-hint">حداقل ۱۰ نویسه</small>
              </label>
            )}
            <button className="primary-button" disabled={busy || !current.configured}>
              {busy
                ? 'در حال انجام…'
                : mode === 'signup'
                  ? 'ساخت حساب'
                  : mode === 'recover'
                    ? 'ارسال پیوند بازیابی'
                    : isRecovery
                      ? 'ذخیره گذرواژه'
                      : 'ورود'}
            </button>
          </form>
          <div className="form-links">
            {!isRecovery && (
              <>
                <button
                  className="quiet-button"
                  onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
                >
                  {mode === 'signup' ? 'حساب دارم' : 'ساخت حساب'}
                </button>
                <button
                  className="quiet-button"
                  onClick={() => setMode(mode === 'recover' ? 'signin' : 'recover')}
                >
                  {mode === 'recover' ? 'بازگشت به ورود' : 'گذرواژه را فراموش کردم'}
                </button>
              </>
            )}
          </div>
          <p role="status">{message}</p>
        </div>
      </section>
    );
  const lookup = (id: string) => catalog?.posts.find((p) => p.id === id);
  const recent = history?.progress.filter((p) => p.state === 'in_progress') ?? [];
  const comments = profile?.comments.filter((c) => c.status !== 'deleted') ?? [];
  return (
    <section className="dashboard">
      <div className="section-heading">
        <div>
          <span className="eyebrow">فضای شخصی</span>
          <h1>داشبورد مطالعه</h1>
          <bdi className="muted">{current.user.email}</bdi>
        </div>
        <button className="quiet-button" disabled={busy} onClick={() => void signout()}>
          خروج از حساب
        </button>
      </div>
      <p role="status">{message}</p>
      {current.roles.length > 0 && (
        <a href="/app/admin" className="primary-button">
          ورود به مدیریت
        </a>
      )}
      {guestCount > 0 && (
        <div className="notice">
          <p>نشانک‌ها و پیشرفت مهمان این مرورگر را هم به حسابت اضافه کن.</p>
          <button disabled={busy} className="quiet-button" onClick={() => void mergeGuest()}>
            انتقال ذخیره‌های مهمان به حساب
          </button>
        </div>
      )}
      <div className="dashboard-grid">
        <section className="console-panel">
          <h2>ادامه خواندن</h2>
          {recent.length ? (
            <AccountList>
              {recent.map((p) => {
                const post = lookup(p.post_id);
                return (
                  <div className="dashboard-row" key={p.post_id}>
                    {post ? (
                      <a href={`/posts/${post.slug}`}>
                        {post.title}
                        <progress value={p.position} max={1} aria-label="پیشرفت خواندن" />
                      </a>
                    ) : (
                      <span>این مطلب در دسترس نیست.</span>
                    )}
                  </div>
                );
              })}
            </AccountList>
          ) : (
            <p className="muted">هنوز مطلبی نیمه‌خوانده نداری.</p>
          )}
        </section>
        <section className="console-panel">
          <h2>نشانک‌ها</h2>
          {history?.bookmarks.length ? (
            <AccountList>
              {history.bookmarks.map((p) => {
                const post = lookup(p.post_id);
                return (
                  <div key={p.post_id} className="dashboard-row">
                    {post ? (
                      <a href={`/posts/${post.slug}`}>{post.title}</a>
                    ) : (
                      <span>این مطلب در دسترس نیست.</span>
                    )}
                  </div>
                );
              })}
            </AccountList>
          ) : (
            <p className="muted">نشانک یک مطلب را بزن تا اینجا ببینی.</p>
          )}
        </section>
        <section className="console-panel">
          <h2>پیشرفت مجموعه‌ها</h2>
          <AccountList>
            {catalog?.collections.map((collection) => {
              const posts = catalog.posts.filter((p) => p.collectionSlug === collection.slug);
              const count = posts.filter((p) =>
                history?.progress.some((h) => h.post_id === p.id && h.state === 'completed'),
              ).length;
              return (
                <div key={collection.slug} className="dashboard-row">
                  <a href={`/collections/${collection.slug}`}>{collection.title}</a>
                  <span>
                    {count.toLocaleString('fa-IR')} از {posts.length.toLocaleString('fa-IR')}
                  </span>
                  <progress
                    value={count}
                    max={Math.max(1, posts.length)}
                    aria-label={collection.title}
                  />
                </div>
              );
            })}
          </AccountList>
        </section>
        <section className="console-panel">
          <h2>تاریخچه مطالعه</h2>
          {history?.progress.length ? (
            <AccountList>
              {history.progress.map((p) => {
                const post = lookup(p.post_id);
                return (
                  <div className="dashboard-row" key={p.post_id}>
                    {post ? (
                      <a href={`/posts/${post.slug}`}>{post.title}</a>
                    ) : (
                      <span>این مطلب در دسترس نیست.</span>
                    )}
                    <small>
                      {p.state === 'completed' ? 'خوانده‌شده' : 'در حال مطالعه'} ·{' '}
                      {new Date(p.updated_at).toLocaleDateString('fa-IR')}
                    </small>
                  </div>
                );
              })}
            </AccountList>
          ) : (
            <p className="muted">تاریخچه‌ات با خواندن مطالب شکل می‌گیرد.</p>
          )}
        </section>
      </div>
      <div className="dashboard-grid">
        <section className="console-panel">
          <h2>پروفایل و تنظیم‌های خواندن</h2>
          {profile && (
            <form
              className="stack-form"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                setBusy(true);
                void api('profile', {
                  displayName: form.get('name'),
                  theme: form.get('theme'),
                  fontSize: Number(form.get('font')),
                })
                  .then(() => {
                    const theme = String(form.get('theme'));
                    const size = String(form.get('font'));
                    localStorage.setItem('city-perspectives:theme', theme);
                    localStorage.setItem('city-perspectives:font', size);
                    document.documentElement.dataset['theme'] = theme;
                    window.dispatchEvent(new Event('city-perspectives:theme'));
                    document.documentElement.style.setProperty('--reading-size', `${size}px`);
                    setMessage('تنظیم‌ها در حساب ذخیره شدند.');
                  })
                  .catch((error) =>
                    setMessage(error instanceof Error ? error.message : 'ذخیره انجام نشد.'),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              <label>
                نام نمایشی
                <input
                  name="name"
                  defaultValue={profile.profile.display_name}
                  maxLength={60}
                  required
                />
              </label>
              <label>
                پوسته
                <select name="theme" defaultValue={profile.profile.preferences.theme ?? 'dark'}>
                  <option value="dark">تاریک</option>
                  <option value="light">روشن</option>
                </select>
              </label>
              <label>
                اندازه متن
                <input
                  type="number"
                  name="font"
                  min={16}
                  max={28}
                  defaultValue={profile.profile.preferences.fontSize ?? 20}
                  required
                />
              </label>
              <button className="primary-button" disabled={busy}>
                ذخیره تنظیم‌ها
              </button>
            </form>
          )}
        </section>
        <section className="console-panel">
          <h2>دیدگاه‌های من</h2>
          {comments.length ? (
            <AccountList>
              {comments.map((c) => (
                <article className="dashboard-row" key={c.id}>
                  <a href={`/posts/${c.post_slug}`}>رفتن به مطلب</a>
                  <p>{c.body}</p>
                  <span className="muted">
                    {c.status === 'pending'
                      ? 'در انتظار بررسی'
                      : c.status === 'published'
                        ? 'منتشرشده'
                        : 'تأیید نشده'}
                  </span>
                </article>
              ))}
            </AccountList>
          ) : (
            <p className="muted">هنوز دیدگاهی ارسال نکرده‌ای.</p>
          )}
        </section>
      </div>
    </section>
  );
}
