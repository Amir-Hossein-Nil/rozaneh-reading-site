import { queryAs, type Row } from './local-database';
import { localUser, signIn, signUp, signOut, recover, changePassword } from './local-auth';
type DbError = { message: string; code?: string };
type Result<T> = { data: T | null; error: DbError | null };
const tables = new Set([
  'user_roles',
  'profiles',
  'source_records',
  'source_record_versions',
  'import_runs',
  'review_items',
  'duplicate_candidates',
  'collections',
  'topics',
  'posts',
  'post_sources',
  'post_revisions',
  'audit_events',
  'bookmarks',
  'reading_progress',
  'comments',
  'published_comments',
  'comment_reports',
  'published_posts',
  'published_collections',
]);
const rpcNames = new Set([
  'member_active',
  'save_profile',
  'save_reader',
  'save_collection',
  'save_post',
  'transition_post',
  'write_comment',
  'moderate_comment',
  'report_comment',
  'editorial_action',
  'import_sources',
  'link_post_source',
]);
function identifier(value: string) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error('Invalid identifier');
  return `"${value}"`;
}
function failure(error: unknown): DbError {
  const value = error as { message?: string; code?: string };
  return {
    message: value.message ?? 'Database operation failed',
    ...(value.code ? { code: value.code } : {}),
  };
}
class LocalQuery implements PromiseLike<Result<Row[]>> {
  private columns = '*';
  private filters: { column: string; value: unknown }[] = [];
  private sort: string | undefined;
  private maximum = 1000;
  constructor(private table: string) {
    if (!tables.has(table)) throw new Error('Invalid table');
  }
  select(columns: string) {
    this.columns = columns === '*' ? '*' : columns.split(',').map(identifier).join(',');
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }
  order(column: string, options: { ascending?: boolean } = {}) {
    this.sort = `${identifier(column)} ${options.ascending === false ? 'desc' : 'asc'}`;
    return this;
  }
  limit(value: number) {
    this.maximum = Math.min(1000, Math.max(1, value));
    return this;
  }
  private async execute(): Promise<Result<Row[]>> {
    try {
      const user = await localUser();
      const conditions = this.filters
        .map((filter, index) => `${identifier(filter.column)}=$${index + 1}`)
        .join(' and ');
      const result = await queryAs(
        user?.id ?? null,
        `select ${this.columns} from public.${identifier(this.table)}${conditions ? ' where ' + conditions : ''}${this.sort ? ' order by ' + this.sort : ''} limit ${this.maximum}`,
        this.filters.map((f) => f.value),
      );
      return { data: result.rows, error: null };
    } catch (error) {
      return { data: null, error: failure(error) };
    }
  }
  async single(): Promise<Result<Row>> {
    const result = await this.execute();
    return result.error
      ? { data: null, error: result.error }
      : result.data?.length === 1
        ? { data: result.data[0]!, error: null }
        : { data: null, error: { message: 'Row not found' } };
  }
  then<TResult1 = Result<Row[]>, TResult2 = never>(
    fulfilled?: ((value: Result<Row[]>) => TResult1 | PromiseLike<TResult1>) | null,
    rejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(fulfilled, rejected);
  }
}
export function localClient() {
  return {
    from: (table: string) => new LocalQuery(table),
    rpc: async (name: string, args: Record<string, unknown> = {}): Promise<Result<unknown>> => {
      try {
        if (!rpcNames.has(name)) throw new Error('Invalid RPC');
        const user = await localUser();
        const keys = Object.keys(args);
        const values = keys.map((key) =>
          typeof args[key] === 'object' && args[key] !== null
            ? JSON.stringify(args[key])
            : args[key],
        );
        const result = await queryAs(
          user?.id ?? null,
          `select public.${identifier(name)}(${keys.map((key, index) => `${identifier(key)} => $${index + 1}`).join(',')}) as result`,
          values,
        );
        return { data: result.rows[0]?.['result'] ?? null, error: null };
      } catch (error) {
        return { data: null, error: failure(error) };
      }
    },
    auth: {
      getUser: async () => ({ data: { user: await localUser() }, error: null }),
      signInWithPassword: async (input: { email: string; password: string }) => {
        try {
          await signIn(input.email, input.password);
          return { data: { user: await localUser(), session: {} }, error: null };
        } catch (error) {
          return { data: { user: null, session: null }, error: failure(error) };
        }
      },
      signUp: async (input: {
        email: string;
        password: string;
        options: { data: { display_name: string }; emailRedirectTo: string };
      }) => {
        try {
          await signUp(input.email, input.password, input.options.data.display_name);
          return { data: { user: null, session: null }, error: null };
        } catch (error) {
          return { data: { user: null, session: null }, error: failure(error) };
        }
      },
      signOut: async () => {
        try {
          await signOut();
          return { error: null };
        } catch (error) {
          return { error: failure(error) };
        }
      },
      resetPasswordForEmail: async (email: string, _options: { redirectTo: string }) => {
        try {
          await recover(email);
          return { error: null };
        } catch (error) {
          return { error: failure(error) };
        }
      },
      updateUser: async (input: { password: string }) => {
        try {
          await changePassword(input.password);
          return { error: null };
        } catch (error) {
          return { error: failure(error) };
        }
      },
      exchangeCodeForSession: async (_code: string) => ({
        data: { user: null },
        error: { message: 'Supabase callback unavailable in local mode' },
      }),
    },
  };
}
