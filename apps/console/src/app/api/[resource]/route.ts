import { randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { configured, serverClient, localMode } from '../../../lib/supabase';
import { validRecovery, clearRecovery } from '../../../lib/recovery-proof';
import { assistantSearch } from '../../../lib/assistant';
import {
  z,
  credentialsSchema,
  privateProgressSchema,
  editorialPostSchema,
  collectionSchema,
} from '@site/contracts';
export const dynamic = 'force-dynamic';
const response = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function check(error: { message: string; code?: string } | null) {
  const messages: Record<string, string> = {
    'Unresolved source review': 'ابتدا بررسی منبع را کامل کنید.',
    'Unresolved duplicates': 'تصمیم بررسی تکرارها هنوز ثبت نشده است.',
    'Review and rights confirmation required': 'یادداشت بررسی و تأیید حقوق انتشار لازم است.',
    'Last administrator': 'آخرین مدیر فعال را نمی‌توان حذف کرد.',
    'Editing closed': 'مهلت ویرایش تمام شده یا این دیدگاه پاسخ تأییدشده دارد.',
    'Rate limit': 'تعداد ارسال‌ها زیاد است؛ کمی بعد دوباره امتحان کنید.',
    'Verified account required': 'ابتدا حساب خود را تأیید کنید.',
    'Duplicate already published': 'منبع تکراری این مطلب قبلاً منتشر شده است.',
  };
  if (error)
    throw new ApiError(
      error.code === '40001'
        ? 'نسخه تغییر کرده؛ صفحه را تازه کنید.'
        : error.code === '42501'
          ? 'اجازه انجام این کار را ندارید.'
          : error.code === '23505'
            ? 'شناسه، شماره قسمت یا ترتیب با مطلب دیگری تداخل دارد.'
            : (messages[error.message] ?? 'عملیات انجام نشد؛ ورودی و وضعیت مطلب را بررسی کنید.'),
      error.message === 'Rate limit'
        ? 429
        : error.code === '40001'
          ? 409
          : error.code === '42501'
            ? 403
            : 400,
    );
}
async function execute(request: Request, resource: string, write: boolean) {
  try {
    const store = await cookies();
    if (resource === 'session' && !write) {
      let csrf = store.get('site-csrf')?.value;
      if (!csrf) {
        csrf = randomBytes(32).toString('hex');
        store.set('site-csrf', csrf, {
          httpOnly: true,
          sameSite: 'strict',
          secure: process.env['SITE_ORIGIN']?.startsWith('https:') ?? false,
          path: '/',
        });
      }
      if (!configured()) return response({ configured: false, user: null, roles: [], csrf });
      const db = await serverClient();
      const {
        data: { user },
      } = await db.auth.getUser();
      const { data: roles } = user
        ? await db.from('user_roles').select('role').eq('user_id', user.id).eq('active', true)
        : { data: [] };
      return response({
        configured: true,
        user: user ? { id: user.id, email: user.email } : null,
        roles: (roles ?? []).map((r) => r.role),
        csrf,
      });
    }
    if (!configured()) throw new ApiError('اتصال پایگاه داده تنظیم نشده است.', 503);
    if (resource === 'assistant' && !write) {
      const params = new URL(request.url).searchParams;
      return response(await assistantSearch(params.get('q') ?? '', params.get('collection') ?? ''));
    }
    let body: unknown;
    if (write) {
      const origin = process.env['SITE_ORIGIN'];
      if (!origin || request.headers.get('origin') !== origin)
        throw new ApiError('Invalid origin', 403);
      const expected = store.get('site-csrf')?.value ?? '';
      const supplied = request.headers.get('x-csrf-token') ?? '';
      if (
        !expected ||
        expected.length !== supplied.length ||
        !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
      )
        throw new ApiError('Invalid CSRF token', 403);
      if (Number(request.headers.get('content-length') ?? 0) > 2_000_000)
        throw new ApiError('فایل بیش از حد بزرگ است.', 413);
      const text = await request.text();
      if (Buffer.byteLength(text) > 2_000_000) throw new ApiError('فایل بیش از حد بزرگ است.', 413);
      body = JSON.parse(text);
    }
    const db = await serverClient();
    if (resource === 'auth' && write) {
      const action = z
        .object({ action: z.enum(['signin', 'signup', 'signout', 'recover', 'password']) })
        .parse(body).action;
      if (action === 'signout') {
        check((await db.auth.signOut()).error);
        return response({ ok: true });
      }
      if (action === 'recover') {
        const input = z.object({ email: z.string().email().max(254) }).parse(body);
        await db.auth.resetPasswordForEmail(input.email, {
          redirectTo: `${process.env['SITE_ORIGIN']}/app/auth/callback?next=recovery`,
        });
        return response({ message: 'اگر حساب موجود باشد، پیوند بازیابی ارسال می‌شود.' });
      }
      if (action === 'password') {
        const input = z.object({ password: z.string().min(10).max(128) }).parse(body);
        const {
          data: { user },
        } = await db.auth.getUser();
        if (!user || !(await validRecovery(user.id)))
          throw new ApiError('پیوند بازیابی معتبر لازم است.', 403);
        check((await db.auth.updateUser({ password: input.password })).error);
        await clearRecovery();
        return response({ message: 'گذرواژه تغییر کرد.' });
      }
      const input = credentialsSchema.parse(body);
      const result =
        action === 'signin'
          ? await db.auth.signInWithPassword({ email: input.email, password: input.password })
          : await db.auth.signUp({
              email: input.email,
              password: input.password,
              options: {
                data: { display_name: input.displayName ?? 'خواننده' },
                emailRedirectTo: `${process.env['SITE_ORIGIN']}/app/auth/callback`,
              },
            });
      if (result.error)
        throw new ApiError(
          localMode()
            ? result.error.message
            : 'ورود یا ثبت‌نام انجام نشد؛ اطلاعات حساب را بررسی کنید.',
          400,
        );
      return response({
        message:
          action === 'signup'
            ? localMode()
              ? 'پیوند تأیید در صندوق نامه محلی ذخیره شد؛ با دستور pnpm local:mail آن را باز کنید.'
              : 'برای تأیید حساب، ایمیل خود را بررسی کنید.'
            : 'وارد شدید.',
        signedIn: !!result.data.session,
      });
    }
    const {
      data: { user },
    } = await db.auth.getUser();
    if (resource === 'comments' && !write) {
      const slug = z
        .string()
        .regex(/^[a-z0-9-]+$/)
        .parse(new URL(request.url).searchParams.get('post'));
      const pub = await db
        .from('published_comments')
        .select('*')
        .eq('post_slug', slug)
        .order('created_at')
        .limit(100);
      check(pub.error);
      const own = user
        ? await db
            .from('comments')
            .select('id,post_slug,body,status,parent_id,version,created_at')
            .eq('post_slug', slug)
            .eq('user_id', user.id)
            .limit(100)
        : { data: [] };
      return response({ published: pub.data, own: own.data });
    }
    if (!user) throw new ApiError('ابتدا وارد حساب شوید.', 401);
    const { data: active } = await db.rpc('member_active');
    if (!active) throw new ApiError('حساب در دسترس نیست.', 403);
    if (resource === 'profile') {
      if (!write) {
        const profile = await db
          .from('profiles')
          .select('display_name,preferences')
          .eq('user_id', user.id)
          .single();
        check(profile.error);
        const comments = await db
          .from('comments')
          .select('id,post_slug,body,status,created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);
        check(comments.error);
        return response({ profile: profile.data, comments: comments.data });
      }
      const input = z
        .object({
          displayName: z.string().min(1).max(60).optional(),
          theme: z.enum(['light', 'dark']).optional(),
          fontSize: z.number().int().min(16).max(28).optional(),
        })
        .strict()
        .parse(body);
      check((await db.rpc('save_profile', { value: input })).error);
      return response({ ok: true });
    }
    if (resource === 'reader') {
      if (!write) {
        const [b, p, preferences] = await Promise.all([
          db
            .from('bookmarks')
            .select('post_id,created_at')
            .order('created_at', { ascending: false }),
          db
            .from('reading_progress')
            .select('post_id,state,position,anchor,anchor_offset,version,updated_at')
            .order('updated_at', { ascending: false }),
          db.from('profiles').select('preferences').eq('user_id', user.id).single(),
        ]);
        check(b.error);
        check(p.error);
        check(preferences.error);
        return response({
          bookmarks: b.data,
          progress: p.data,
          preferences: preferences.data?.preferences ?? {},
        });
      }
      const input = z
        .discriminatedUnion('operation', [
          privateProgressSchema.extend({ operation: z.literal('progress') }),
          z.object({
            operation: z.literal('bookmark'),
            post: z.string().min(1).max(200),
            saved: z.boolean(),
          }),
        ])
        .parse(body);
      check(
        (
          await db.rpc('save_reader', {
            post: input.post,
            operation: input.operation,
            value: input,
          })
        ).error,
      );
      return response({ ok: true });
    }
    if (resource === 'comments' && write) {
      const input = z
        .object({
          post: z.string().regex(/^[a-z0-9-]+$/),
          body: z.string().max(2000),
          parent: z.string().uuid().nullable().default(null),
          id: z.string().uuid().nullable().default(null),
          version: z.number().int().nonnegative().default(0),
          operation: z.enum(['save', 'delete']).default('save'),
        })
        .parse(body);
      const result = await db.rpc('write_comment', {
        post: input.post,
        text_body: input.body,
        parent: input.parent,
        comment: input.id,
        expected: input.version,
        operation: input.operation,
      });
      check(result.error);
      return response({ id: result.data });
    }
    if (resource === 'report' && write) {
      const input = z
        .object({ id: z.string().uuid(), reason: z.string().min(1).max(300) })
        .parse(body);
      check(
        (await db.rpc('report_comment', { comment: input.id, explanation: input.reason })).error,
      );
      return response({ ok: true });
    }
    if (resource === 'admin') {
      const { data: roles, error } = await db
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('active', true);
      check(error);
      const names = (roles ?? []).map((r) => r.role);
      const editor = names.includes('editor') || names.includes('admin');
      const moderator = names.includes('moderator') || names.includes('admin');
      if (!editor && !moderator) throw new ApiError('دسترسی مدیریت ندارید.', 403);
      if (!write) {
        const tables = editor
          ? [
              'posts',
              'collections',
              'topics',
              'review_items',
              'duplicate_candidates',
              'source_records',
              'source_record_versions',
            ]
          : [];
        if (names.includes('admin')) tables.push('profiles', 'user_roles');
        if (moderator) tables.push('comments', 'comment_reports');
        const data: Record<string, unknown> = {};
        for (const table of tables) {
          const result = await db.from(table).select('*').limit(500);
          check(result.error);
          data[table] = result.data;
        }
        return response(data);
      }
      const action = z
        .object({
          action: z.enum([
            'save',
            'transition',
            'collection',
            'moderate',
            'topic',
            'review',
            'duplicate',
            'resolve-report',
            'role',
            'profile',
            'import',
          ]),
        })
        .parse(body).action;
      if (action === 'save') {
        const input = z
          .object({
            value: editorialPostSchema,
            expected: z.number().int().nonnegative(),
            note: z.string().max(2000),
            rights: z.boolean(),
            source: z.string().uuid().optional(),
          })
          .parse(body);
        const { source, ...args } = input;
        check((await db.rpc('save_post', args)).error);
        if (source)
          check((await db.rpc('link_post_source', { post: input.value.id, source })).error);
      }
      if (action === 'transition') {
        const input = z
          .object({
            post: z.string(),
            expected: z.number().int().positive(),
            target: z.enum(['in_review', 'published', 'unpublished', 'archived', 'draft']),
          })
          .parse(body);
        check((await db.rpc('transition_post', input)).error);
      }
      if (action === 'collection') {
        const input = z.object({ value: collectionSchema }).parse(body);
        check((await db.rpc('save_collection', input)).error);
      }
      if (action === 'moderate') {
        const input = z
          .object({
            comment: z.string().uuid(),
            expected: z.number().int().positive(),
            target: z.enum(['published', 'rejected']),
            reason: z.string().max(300).default(''),
          })
          .parse(body);
        check((await db.rpc('moderate_comment', input)).error);
      }
      if (['topic', 'review', 'duplicate', 'resolve-report', 'role', 'profile'].includes(action)) {
        const input = z.object({ action: z.string(), value: z.record(z.unknown()) }).parse(body);
        check((await db.rpc('editorial_action', { operation: action, value: input.value })).error);
      }
      if (action === 'import') {
        const input = z
          .object({
            dataset: z.enum(['bale-main', 'bale-supplemental']),
            records: z
              .array(
                z
                  .object({ id: z.string().min(1).max(100), text: z.string().min(1).max(100000) })
                  .passthrough(),
              )
              .min(1)
              .max(1000),
            fileHash: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .parse(body);
        check(
          (
            await db.rpc('import_sources', {
              dataset_name: input.dataset,
              records: input.records,
              file_hash: input.fileHash,
            })
          ).error,
        );
      }
      return response({ ok: true });
    }
    throw new ApiError('Not found', 404);
  } catch (error) {
    if (error instanceof ApiError) return response({ error: error.message }, error.status);
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return response({ error: 'ورودی نامعتبر است.' }, 400);
    return response({ error: 'ارتباط با سرویس برقرار نشد. دوباره تلاش کنید.' }, 503);
  }
}
type Context = { params: Promise<{ resource: string }> };
export async function GET(request: Request, context: Context) {
  return execute(request, (await context.params).resource, false);
}
export async function POST(request: Request, context: Context) {
  return execute(request, (await context.params).resource, true);
}
