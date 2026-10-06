# Verification record

Verified on 2026-10-02. The website is running locally at `http://localhost:3200`; both production builds also pass. The archive expansion was browser-tested against the development server.

| Check | Result |
| --- | --- |
| `pnpm typecheck` | Passed; Astro reported zero errors, warnings, and hints; strict Next/shared TypeScript passed. |
| `pnpm lint` | Passed. |
| `pnpm format:check` | Passed, including Astro templates. |
| `pnpm test` | 22 passed across archive organization, content, database permissions/workflows, and disk persistence. |
| `pnpm build` | Both Astro SSR and Next.js production builds passed. |
| `pnpm test:e2e` after complete archive publication | 9 passed, 2 skipped; no failures. The earlier sample-only production preview also passed eight browser tests. |
| Browser accessibility audit | Zero WCAG A/AA violations on the tested homepage, article, and account screens at 390px/1440px in both themes. |
| Current catalog | HTTP 200, 123 published posts representing all 158 source records, eight collections, `Cache-Control: no-store`. |

The complete-archive browser test verified every original text/ID against both preserved JSON archives, all eight collection counts, repeated original episode numbers, mobile overflow, and HTTP 200 article pages for all 123 posts. Complete import reruns retain the same post count and source mapping. See `19-complete-archive.md`.

Skipped cases are the explicitly unconfigured-backend scenario and the optional externally supplied account fixture. The local suite independently verifies actual registration, confirmation, two-session persistence, privacy, publishing, moderation, recovery, and sign-out.

Screenshots are saved in `docs/verification`: homepage/article/account at both viewport sizes and both themes, administrator editor desktop, and administrator mobile. The approved source references remain in `docs/design` and no new AI images were generated.

The PostgreSQL tests execute the actual numbered migrations under anonymous/authenticated database roles, with distinct identities. The application uses a persistent PostgreSQL instance and real local authentication; no mock authentication or browser-only account persistence is substituted.

Public browser checks cover original source text, ordered episodes, explicit completion, font controls, reload persistence, search, guest bookmarks, light/dark themes, keyboard focus, reduced motion, missing pages, and reading without JavaScript.

The local account browser journey uses actual registration, local confirmation letters, two independent sessions, private bookmarks/progress, authorization failures, real editorial publishing, moderation, recovery, and session revocation. Local test accounts and a random development administrator are retained in the ignored development database.

Additional security assertions cover attempts to forge recovery permission, stale edits/progress, immutable originals, anonymous draft access, cross-user private reads/writes, moderator/editor boundaries, malformed public metadata, and protection of the final active administrator. The disk test closes PostgreSQL and reopens committed data from the filesystem; the application database also retained accounts and content through the switch from development to production servers.

The user explicitly authorized complete local archive publication. Remaining limitations are unique post imagery supplied by an editor, missing source attachments, external internet email delivery, and production deployment/backup rehearsal. The selected local database/account setup requires neither Docker nor an external URL.
