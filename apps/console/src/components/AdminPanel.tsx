'use client';
import { useEffect, useState, type SubmitEvent } from 'react';
import { api, session, type Session } from '@site/ui/api';
import { z, editorialPostSchema, collectionSchema, type Post } from '@site/contracts';
import { parseExport, duplicateReport } from '@site/content/import';
const postRow = z.object({
  id: z.string(),
  payload: editorialPostSchema,
  status: z.string(),
  version: z.number(),
  review_note: z.string().nullable(),
  rights_confirmed: z.boolean(),
});
const sourceRow = z.object({
  id: z.string().uuid(),
  record_id: z.string().uuid(),
  original_text: z.string(),
  raw: z.record(z.unknown()),
});
const adminSchema = z.object({
  posts: z.array(postRow).default([]),
  collections: z.array(z.object({ slug: z.string(), payload: collectionSchema })).default([]),
  topics: z.array(z.object({ slug: z.string(), title: z.string() })).default([]),
  source_records: z
    .array(z.object({ id: z.string(), dataset: z.string(), external_id: z.string() }))
    .default([]),
  source_record_versions: z.array(sourceRow).default([]),
  review_items: z
    .array(
      z.object({
        source_version: z.string(),
        decision: z.string(),
        flags: z.array(z.string()),
        reason: z.string().nullable(),
      }),
    )
    .default([]),
  duplicate_candidates: z
    .array(
      z.object({
        first_version: z.string(),
        second_version: z.string(),
        method: z.string(),
        score: z.coerce.number(),
        decision: z.string(),
      }),
    )
    .default([]),
  comments: z
    .array(
      z.object({
        id: z.string(),
        post_slug: z.string(),
        body: z.string(),
        status: z.string(),
        version: z.number(),
        author_name: z.string(),
      }),
    )
    .default([]),
  comment_reports: z
    .array(
      z.object({
        id: z.string(),
        comment_id: z.string(),
        reason: z.string(),
        resolved: z.boolean(),
      }),
    )
    .default([]),
  profiles: z
    .array(z.object({ user_id: z.string(), display_name: z.string(), suspended: z.boolean() }))
    .default([]),
  user_roles: z
    .array(z.object({ user_id: z.string(), role: z.string(), active: z.boolean() }))
    .default([]),
});
type AdminData = z.infer<typeof adminSchema>;
type Draft = { value: Post; expected: number; note: string; rights: boolean; source?: string };
export function AdminPanel() {
  const [current, setCurrent] = useState<Session | null>(null);
  const [data, setData] = useState<AdminData | null>(null);
  const [tab, setTab] = useState('posts');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [importData, setImportData] = useState<{
    records: ReturnType<typeof parseExport>;
    fileHash: string;
    report: ReturnType<typeof duplicateReport>;
  } | null>(null);
  const [dataset, setDataset] = useState('bale-main');
  async function reload() {
    setData(adminSchema.parse(await api('admin')));
  }
  useEffect(() => {
    void session()
      .then(async (s) => {
        setCurrent(s);
        if (s.user && s.roles.length) await reload();
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'بارگیری انجام نشد.'));
  }, []);
  async function action(value: unknown) {
    setBusy(true);
    setMessage('');
    try {
      await api('admin', value);
      await reload();
      setMessage('تغییر ثبت شد.');
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'عملیات انجام نشد.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  const admin = current?.roles.includes('admin');
  const editor = admin || current?.roles.includes('editor');
  const moderator = admin || current?.roles.includes('moderator');
  if (!current)
    return (
      <section className="console-panel">
        <h1>مدیریت مطالب</h1>
        <p role="status">{message || 'در حال بررسی دسترسی…'}</p>
      </section>
    );
  if (!current.configured || !current.user || !current.roles.length)
    return (
      <section className="console-panel">
        <h1>مدیریت مطالب</h1>
        <p>
          {!current.configured
            ? 'ابتدا اتصال Supabase را تنظیم کنید.'
            : 'برای دسترسی به مدیریت، حساب دارای نقش تحریریه لازم است.'}
        </p>
        <a className="primary-button" href="/app">
          حساب کاربری
        </a>
      </section>
    );
  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const f = new FormData(event.currentTarget);
    const number = (key: string) => (f.get(key) ? Number(f.get(key)) : null);
    const value = {
      ...draft.value,
      title: String(f.get('title')),
      collectionSlug: f.get('collection') || null,
      episodeNumber: number('episode'),
      readingOrder: number('order'),
      topic: String(f.get('topic')),
      editorialStatus: 'preview',
    };
    if (
      await action({
        action: 'save',
        value,
        expected: draft.expected,
        note: String(f.get('note')),
        rights: f.get('rights') === 'on',
        source: draft.source,
      })
    )
      setDraft(null);
  }
  async function selectFile(file: File | undefined) {
    setImportData(null);
    if (!file) return;
    if (file.size > 1_500_000) {
      setMessage('فایل باید کمتر از ۱٫۵ مگابایت باشد.');
      return;
    }
    try {
      const bytes = await file.arrayBuffer();
      const records = parseExport(JSON.parse(new TextDecoder().decode(bytes)));
      if (records.length > 1000) throw new Error('حداکثر ۱۰۰۰ رکورد در هر فایل.');
      const hash = await crypto.subtle.digest('SHA-256', bytes);
      setImportData({
        records,
        fileHash: Array.from(new Uint8Array(hash), (x) => x.toString(16).padStart(2, '0')).join(''),
        report: duplicateReport(records),
      });
      setMessage('تحلیل انجام شد؛ هیچ رکوردی هنوز وارد پایگاه نشده است.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'فایل معتبر نیست.');
    }
  }
  function fromSource(source: z.infer<typeof sourceRow>) {
    const record = data?.source_records.find((r) => r.id === source.record_id);
    if (!record) return;
    setDraft({
      value: {
        id: `${record.dataset}:${record.external_id}`,
        slug: `source-${record.dataset}-${record.external_id}`,
        title: String(source.raw['title'] ?? record.external_id),
        originalText: source.original_text,
        sourceIds: [record.external_id],
        dataset: record.dataset,
        collectionSlug: null,
        episodeNumber: null,
        readingOrder: null,
        topic: '',
        cover: 'care',
        sourcePublishedAt: null,
        editorialStatus: 'preview',
      },
      source: source.id,
      expected: 0,
      note: '',
      rights: false,
    });
    setTab('posts');
  }
  return (
    <section className="dashboard">
      <div className="section-heading">
        <div>
          <span className="eyebrow">تحریریه</span>
          <h1>مدیریت مطالب</h1>
        </div>
        <a href="/app" className="quiet-button">
          داشبورد مطالعه
        </a>
      </div>
      <nav className="admin-tabs" aria-label="بخش‌های مدیریت">
        {(editor
          ? [
              ['posts', 'مطالب'],
              ['collections', 'مجموعه‌ها'],
              ['topics', 'موضوع‌ها'],
              ['import', 'ورود و بررسی منابع'],
            ]
          : []
        )
          .concat(moderator ? [['comments', 'دیدگاه‌ها']] : [])
          .concat(admin ? [['users', 'کاربران']] : [])
          .map(([key, label]) => (
            <button
              key={key}
              className="quiet-button"
              aria-pressed={tab === key}
              onClick={() => {
                setTab(key!);
                setDraft(null);
              }}
            >
              {label}
            </button>
          ))}
      </nav>
      <p role="status" className="notice">
        {message ||
          'متن منبع و شناسه‌ها تغییرپذیر نیستند. تغییر پیش‌نویس تا انتشار، صفحه عمومی را تغییر نمی‌دهد.'}
      </p>
      {!data && <p>در حال بارگیری…</p>}
      {tab === 'posts' &&
        editor &&
        (draft ? (
          <div className="editor-grid">
            <section className="console-panel">
              <h2>ویرایش پیش‌نویس</h2>
              <form className="stack-form" onSubmit={(e) => void save(e)}>
                <label>
                  عنوان
                  <input
                    name="title"
                    defaultValue={draft.value.title}
                    required
                    maxLength={200}
                    onChange={(e) =>
                      setDraft({ ...draft, value: { ...draft.value, title: e.target.value } })
                    }
                  />
                </label>
                <label>
                  مجموعه
                  <select name="collection" defaultValue={draft.value.collectionSlug ?? ''}>
                    <option value="">مطلب مستقل</option>
                    {data?.collections.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.payload.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  شماره قسمت در منبع
                  <input
                    name="episode"
                    type="number"
                    min={1}
                    defaultValue={draft.value.episodeNumber ?? ''}
                  />
                  <small>اگر مشخص نیست خالی بماند؛ شماره نسازید.</small>
                </label>
                <label>
                  ترتیب خواندن
                  <input
                    name="order"
                    type="number"
                    min={1}
                    defaultValue={draft.value.readingOrder ?? ''}
                  />
                </label>
                <label>
                  موضوع
                  <select name="topic" defaultValue={draft.value.topic}>
                    <option value={draft.value.topic}>{draft.value.topic || 'انتخاب موضوع'}</option>
                    {data?.topics.map((t) => (
                      <option value={t.title} key={t.slug}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  یادداشت بررسی
                  <textarea
                    name="note"
                    defaultValue={draft.note}
                    maxLength={2000}
                    required
                    minLength={5}
                  />
                </label>
                <label>
                  <input type="checkbox" name="rights" defaultChecked={draft.rights} />
                  حقوق انتشار بررسی و تأیید شده است.
                </label>
                <details>
                  <summary>متن و شناسه‌های محفوظ منبع</summary>
                  <p>
                    <bdi>{draft.value.sourceIds.join(' · ')}</bdi>
                  </p>
                  <p className="editor-original">{draft.value.originalText}</p>
                </details>
                <button className="primary-button" disabled={busy}>
                  ذخیره پیش‌نویس
                </button>
                <button type="button" className="quiet-button" onClick={() => setDraft(null)}>
                  بازگشت
                </button>
              </form>
            </section>
            <article className="editor-preview">
              <span className="eyebrow">پیش‌نمایش خصوصی</span>
              <h1>{draft.value.title}</h1>
              <p>{draft.value.originalText}</p>
            </article>
          </div>
        ) : (
          <div className="episode-list">
            {data?.posts.length ? (
              data.posts.map((p) => (
                <div className="dashboard-row" key={p.id}>
                  <h2>{p.payload.title}</h2>
                  <span className="muted">
                    {p.status} · نسخه {p.version.toLocaleString('fa-IR')}
                  </span>
                  <div className="editor-actions">
                    <button
                      className="quiet-button"
                      onClick={() =>
                        setDraft({
                          value: p.payload,
                          expected: p.version,
                          note: p.review_note ?? '',
                          rights: p.rights_confirmed,
                        })
                      }
                    >
                      ویرایش و پیش‌نمایش
                    </button>
                    <button
                      className="quiet-button"
                      disabled={busy}
                      onClick={() =>
                        void action({
                          action: 'transition',
                          post: p.id,
                          expected: p.version,
                          target: 'in_review',
                        })
                      }
                    >
                      ارسال برای بررسی
                    </button>
                    {admin && (
                      <>
                        <button
                          className="primary-button"
                          disabled={busy || !['in_review', 'published'].includes(p.status)}
                          onClick={() =>
                            void action({
                              action: 'transition',
                              post: p.id,
                              expected: p.version,
                              target: 'published',
                            })
                          }
                        >
                          انتشار
                        </button>
                        <button
                          className="quiet-button"
                          disabled={busy}
                          onClick={() =>
                            void action({
                              action: 'transition',
                              post: p.id,
                              expected: p.version,
                              target: p.status === 'archived' ? 'draft' : 'archived',
                            })
                          }
                        >
                          {p.status === 'archived' ? 'بازیابی پیش‌نویس' : 'آرشیو'}
                        </button>
                        <button
                          className="quiet-button"
                          disabled={busy || p.status !== 'published'}
                          onClick={() =>
                            void action({
                              action: 'transition',
                              post: p.id,
                              expected: p.version,
                              target: 'unpublished',
                            })
                          }
                        >
                          لغو انتشار
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <h2>هنوز پیش‌نویسی نیست</h2>
                <p>از بخش ورود منابع، فایل JSON را بررسی و به پیش‌نویس تبدیل کنید.</p>
              </div>
            )}
          </div>
        ))}
      {tab === 'collections' && editor && (
        <>
          <div className="related-grid">
            {data?.collections.map((c) => (
              <article className="console-panel" key={c.slug}>
                <h2>{c.payload.title}</h2>
                <p>{c.payload.description}</p>
                <bdi>{c.slug}</bdi>
              </article>
            ))}
          </div>
          {admin && (
            <section className="console-panel">
              <h2>ساخت یا تغییر مجموعه</h2>
              <form
                className="stack-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void action({ action: 'collection', value: Object.fromEntries(f) });
                }}
              >
                <label>
                  شناسه ثابت
                  <input name="slug" dir="ltr" pattern="[a-z0-9-]+" required />
                </label>
                <label>
                  عنوان
                  <input name="title" required />
                </label>
                <label>
                  زیرعنوان
                  <input name="subtitle" required />
                </label>
                <label>
                  توضیح
                  <textarea name="description" required />
                </label>
                <label>
                  رنگ هویت
                  <input type="color" name="accent" defaultValue="#006c85" />
                </label>
                <button className="primary-button" disabled={busy}>
                  ذخیره مجموعه
                </button>
              </form>
            </section>
          )}
        </>
      )}
      {tab === 'topics' && editor && (
        <section className="console-panel">
          <h2>موضوع‌ها</h2>
          {data?.topics.map((t) => (
            <p key={t.slug}>
              {t.title} · <bdi>{t.slug}</bdi>
            </p>
          ))}
          {admin && (
            <form
              className="stack-form"
              onSubmit={(e) => {
                e.preventDefault();
                void action({
                  action: 'topic',
                  value: Object.fromEntries(new FormData(e.currentTarget)),
                });
              }}
            >
              <label>
                شناسه
                <input name="slug" pattern="[a-z0-9-]+" dir="ltr" required />
              </label>
              <label>
                عنوان
                <input name="title" required maxLength={100} />
              </label>
              <button className="primary-button" disabled={busy}>
                ذخیره موضوع
              </button>
            </form>
          )}
        </section>
      )}
      {tab === 'import' && editor && (
        <>
          <section className="console-panel">
            <h2>تحلیل فایل JSON</h2>
            <div className="stack-form">
              <label>
                فضای شناسه منبع
                <select value={dataset} onChange={(e) => setDataset(e.target.value)}>
                  <option value="bale-main">bale-main</option>
                  <option value="bale-supplemental">bale-supplemental</option>
                </select>
              </label>
              <label>
                فایل
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => void selectFile(e.target.files?.[0])}
                />
              </label>
            </div>
            {importData && (
              <>
                <p>
                  {importData.report.totalRecords} رکورد · {importData.report.exact.length} گروه
                  تکرار دقیق · {importData.report.near.length} جفت مشابه
                </p>
                <p>همه منابع وارد صف بررسی می‌شوند. ورود دوباره رکورد تکراری ایجاد نمی‌کند.</p>
                <button
                  className="primary-button"
                  disabled={busy}
                  onClick={() =>
                    void action({
                      action: 'import',
                      dataset,
                      records: importData.records,
                      fileHash: importData.fileHash,
                    })
                  }
                >
                  ورود منابع برای بررسی
                </button>
              </>
            )}
          </section>
          <h2>صف بررسی منابع</h2>
          {data?.review_items.map((review) => {
            const source = data.source_record_versions.find((s) => s.id === review.source_version);
            const record = data.source_records.find((r) => r.id === source?.record_id);
            return (
              <details className="comment-card" key={review.source_version}>
                <summary>
                  <bdi>
                    {record?.dataset}:{record?.external_id}
                  </bdi>{' '}
                  · {review.decision}
                </summary>
                <p>{source?.original_text}</p>
                <p className="muted">{review.flags.join(' · ')}</p>
                <form
                  className="stack-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void action({
                      action: 'review',
                      value: {
                        id: review.source_version,
                        decision: f.get('decision'),
                        reason: f.get('reason'),
                      },
                    });
                  }}
                >
                  <label>
                    تصمیم
                    <select name="decision">
                      <option value="accepted">پذیرش منبع برای پیش‌نویس</option>
                      <option value="excluded">خارج از انتشار</option>
                    </select>
                  </label>
                  <label>
                    دلیل بررسی و حل ابهام‌ها
                    <textarea
                      name="reason"
                      minLength={5}
                      maxLength={2000}
                      required
                      defaultValue={review.reason ?? ''}
                    />
                  </label>
                  <button className="quiet-button" disabled={busy}>
                    ثبت تصمیم
                  </button>
                </form>
                {review.decision === 'accepted' && source && (
                  <button
                    className="primary-button"
                    disabled={data.posts.some(
                      (p) => p.id === `${record?.dataset}:${record?.external_id}`,
                    )}
                    onClick={() => fromSource(source)}
                  >
                    ساخت پیش‌نویس از این منبع
                  </button>
                )}
              </details>
            );
          })}
          <h2>بررسی تکرارها</h2>
          {data?.duplicate_candidates.map((d) => (
            <form
              key={d.first_version + d.second_version}
              className="comment-card stack-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void action({
                  action: 'duplicate',
                  value: {
                    first: d.first_version,
                    second: d.second_version,
                    decision: f.get('decision'),
                    reason: f.get('reason'),
                  },
                });
              }}
            >
              <p>
                {d.method} · {Math.round(d.score * 100)}٪ · {d.decision}
              </p>
              <details>
                <summary>مقایسه متن‌ها</summary>
                {[d.first_version, d.second_version].map((id) => (
                  <p key={id}>
                    {data.source_record_versions.find((s) => s.id === id)?.original_text}
                  </p>
                ))}
              </details>
              <label>
                تصمیم
                <select name="decision">
                  <option value="distinct">دو مطلب مستقل</option>
                  <option value="duplicate">تکرار یک مطلب؛ فقط منبع اصلی منتشر شود</option>
                </select>
              </label>
              <label>
                دلیل
                <input name="reason" minLength={5} required />
              </label>
              <button className="quiet-button" disabled={busy}>
                ثبت تصمیم تکرار
              </button>
            </form>
          ))}
        </>
      )}
      {tab === 'comments' && moderator && (
        <>
          <h2>تعدیل دیدگاه‌ها</h2>
          {data?.comments
            .filter((c) => c.status !== 'deleted')
            .map((c) => (
              <article className="comment-card" key={c.id}>
                <header>
                  <b>{c.author_name}</b>
                  <span>{c.status}</span>
                </header>
                <p>{c.body}</p>
                <form
                  className="stack-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void action({
                      action: 'moderate',
                      comment: c.id,
                      expected: c.version,
                      target: f.get('target'),
                      reason: f.get('reason'),
                    });
                  }}
                >
                  <label>
                    تصمیم
                    <select name="target">
                      <option value="published">تأیید انتشار</option>
                      <option value="rejected">رد</option>
                    </select>
                  </label>
                  <label>
                    دلیل رد
                    <input name="reason" maxLength={300} />
                  </label>
                  <button disabled={busy} className="quiet-button">
                    ثبت تعدیل
                  </button>
                </form>
              </article>
            ))}
          <h2>گزارش‌های باز</h2>
          {data?.comment_reports
            .filter((r) => !r.resolved)
            .map((r) => (
              <article className="comment-card" key={r.id}>
                <p>{r.reason}</p>
                <bdi>{r.comment_id}</bdi>
                <button
                  className="quiet-button"
                  disabled={busy}
                  onClick={() => void action({ action: 'resolve-report', value: { id: r.id } })}
                >
                  رسیدگی شد
                </button>
              </article>
            ))}
        </>
      )}
      {tab === 'users' && admin && (
        <section className="console-panel">
          <h2>نقش‌ها و وضعیت حساب</h2>
          <p>نشانک و تاریخچه خصوصی کاربران در مدیریت نمایش داده نمی‌شود.</p>
          {data?.profiles.map((p) => (
            <div className="dashboard-row" key={p.user_id}>
              <b>{p.display_name}</b>
              <bdi>{p.user_id}</bdi>
              <span>
                {data.user_roles
                  .filter((r) => r.user_id === p.user_id && r.active)
                  .map((r) => r.role)
                  .join(' · ')}
              </span>
              <button
                className="quiet-button"
                disabled={busy}
                onClick={() =>
                  void action({
                    action: 'profile',
                    value: { user: p.user_id, suspended: !p.suspended },
                  })
                }
              >
                {p.suspended ? 'فعال‌سازی حساب' : 'تعلیق حساب'}
              </button>
              <form
                className="stack-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void action({
                    action: 'role',
                    value: {
                      user: p.user_id,
                      role: f.get('role'),
                      active: f.get('active') === 'on',
                    },
                  });
                }}
              >
                <label>
                  نقش
                  <select name="role">
                    <option>editor</option>
                    <option>moderator</option>
                    <option>admin</option>
                  </select>
                </label>
                <label>
                  <input type="checkbox" name="active" defaultChecked />
                  فعال
                </label>
                <button className="quiet-button" disabled={busy}>
                  ثبت نقش
                </button>
              </form>
            </div>
          ))}
        </section>
      )}
    </section>
  );
}
