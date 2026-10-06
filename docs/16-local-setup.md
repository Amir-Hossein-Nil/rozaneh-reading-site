# Local setup and operations

## Architecture adjustment

The user requested a local database and confirmed that neither Docker nor a Supabase URL is available. Keep Astro and Next.js in their agreed roles, retain PostgreSQL migrations and RLS, and run PostgreSQL locally with PGlite. Next.js is the single authority for local accounts and opaque sessions. Astro reads only the anonymous public catalog over a loopback endpoint; it never opens the database files or handles credentials.

Supabase remains an optional adapter (`AUTH_MODE=supabase`, `CONTENT_MODE=supabase`); its external email/account integrations have not been verified here. Local mode is the supported, tested default. Development and production Next builds use separate output directories so a build cannot overwrite the active development bundle.

## Requirements and startup

Node 24+, pnpm 11, and a modern browser. No database installer is required.

1. Run `pnpm install` in the repository.
2. Copy `.env.example` to `apps/reader/.env` and `apps/console/.env.local`.
3. Leave `AUTH_MODE=local`, `CONTENT_MODE=local`, and `SITE_ORIGIN=http://localhost:3200`.
4. Run `pnpm dev` and open the main URL. The internal ports are 3201/3202.

The gateway injects the correct loopback catalog URL into Astro. If using a different port (`pnpm dev --port 3300`), update `SITE_ORIGIN` in both environment files as well. Cookies, origin validation, confirmation links, and recovery links must use the same origin.

The first public request initializes `.local/postgres`, applies numbered SQL migrations, imports available private archives, and prepares the existing 16 development samples. On a clean checkout without the private archives, the same 16 exact text samples can still seed the development database. For the full archives, first run:

```powershell
pnpm content:import "C:\Users\ahnil\OneDrive\Desktop\bale_group_2_cleaned.json" "C:\Users\ahnil\OneDrive\Desktop\bale_messages_for_codex.json"
```

The current workspace already has both byte-preserved archives. Initial seeding is idempotent. The startup marker prevents later restarts from overwriting editorial changes. Subsequent source files can be imported through the administrator interface; every imported source stays in review until a decision is recorded. The CLI archive process retains the original file bytes and SHA-256; database source versions preserve raw field values and exact text.

## Accounts and local letters

Registration creates a real user and a scrypt password hash. Confirmation tokens, recovery tokens, and session tokens are cryptographically random; their database representations are hashed. Sessions last seven days and are stored in HttpOnly cookies. Database suspension, server checks, and RLS apply on every authenticated request. Password recovery revokes existing sessions.

There is no external SMTP server in local mode. Run `pnpm local:mail` to read the most recent letters saved under `.local/mail`, then open the link for your address. These files belong to the developer/operator and are never served by a public route. They expire; consumed links cannot be used again. This local outbox does not send real internet email.

Bootstrap the first administrator only after verifying an account: `pnpm local:admin address@example.test`. The command proves possession of a private operator capability in `.local/bootstrap-admin.key`. The endpoint refuses bootstrap once an active administrator exists. There is no public self-promotion form. The development test administrator's random credentials are saved privately in `.local/development-account.json` in this workspace.

## Editorial workflow

The user subsequently requested all JSON posts on the local site. The current database contains 123 distinct public posts covering all 158 source IDs in eight collections. Exact duplicate IDs share a post; different original texts stay separate. See `19-complete-archive.md` for the repeatable authenticated publication command and ordering decisions. Clean startup still seeds only the original 16 samples until that explicit command runs.

1. Sign in and open `/app/admin`.
2. Analyze and import JSON in the source tab. The main envelope and supplemental array use independent namespaces.
3. Compare source versions, resolve exact/near duplicate candidates, and record reasons for acceptance/exclusion. Episode-number ambiguity and media-dependent fragments require explicit review.
4. Create a draft from an accepted source; choose title, collection, topic, episode number if actually present, and reading order. Missing numbers stay empty.
5. Save, preview, submit for review, and publish as an administrator. Editors cannot publish; moderators cannot edit content or roles.
6. Saving a draft does not change the public revision. Publication updates the anonymous projection atomically. Archive/unpublish removes it from the public catalog while retaining private bookmarks/history.

Original text, source IDs, dataset identity, and existing slugs are immutable. Presentation paragraph segmentation is derived and reconstructs the exact original. System timestamps describe imports and user actions; unknown source publication dates remain null.

Comments start pending. Confirmed members can submit one-level replies, report comments, edit eligible comments within 15 minutes, and delete their own comments. Moderation never rewrites a user's text. Deleted/rejected published roots retain a public placeholder for their replies. Database rate limits and version checks apply even if the web UI is bypassed.

## Persistence, backup, and limitations

Only one Next server may open `.local/postgres`; a process lock prevents concurrent development/preview instances. Stop with Ctrl+C before switching modes or copying the database. Back up `.local/postgres`, `.local/source-archive`, and needed operator files together while the server is stopped. Preserve the SQL migrations and lockfile with the application source. A stale process lock is automatically reclaimed only when its recorded process is no longer alive.

Local mode is intended for this workstation and a single server process. A public, replicated deployment needs a separately configured database/auth/mail service and release review. No deployment or paid service has been created. The approved photographs are reused as visual assets; unique artwork/media for every source record is not present in the JSON and requires editorially supplied files.
