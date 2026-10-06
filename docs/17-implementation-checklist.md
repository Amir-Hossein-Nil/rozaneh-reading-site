# Implementation checklist

Status labels: implemented, verified, or pending. A configured integration is not described as verified merely because code exists.

## Foundations and public reading

- [x] Inspect source JSON, approved planning documents, selected image references, and repository instructions.
- [x] Astro SSR public reader, Next.js account/admin/API app, shared contracts/content/UI/design packages.
- [x] Strict TypeScript, linting, formatting, environment example, reproducible setup.
- [x] Persian Vazirmatn typography, full RTL, responsive navigation, approved photographic composition, light/dark modes.
- [x] Homepage with one suggested post; collection list and correctly ordered episodes; article pages.
- [x] Exact original text/source IDs; unknown dates remain unknown; missing episode numbers are not filled.
- [x] Previous/next episodes, related posts, estimated reading time, Persian search and collection/topic filters.
- [x] Font-size controls, stable reading anchors, reduced motion, keyboard/focus support, loading/empty/error states.

## Local data and accounts

- [x] User-requested local PostgreSQL on disk, automatic migrations, development fixtures, private full-source import.
- [x] Registration, email confirmation through local outbox, sign-in/out, password recovery.
- [x] Persistent sessions and server authorization; RLS isolates each user's bookmarks/history/progress.
- [x] Explicit completion; merely opening a post never completes it.
- [x] Dashboard with continue reading, bookmarks/history, collection progress, profile/preferences, own comments.
- [x] Optional explicit guest-data transfer; guest/account storage stays separate.
- [x] Browser verification of real local accounts, two sessions, publishing, and comment moderation.

## Editorial and moderation

- [x] Idempotent import, immutable source versions and file-byte archives, exact/near duplicate review.
- [x] Source review, source-based draft creation, title/topic/collection/order editing, private preview, revisions.
- [x] Publication, unpublication, archive, restore; server/database role checks and conflict handling.
- [x] Collection/topic management, user suspension and role management; protect last administrator.
- [x] Authenticated comments/replies, edit/delete/report controls, moderation queue and report resolution.
- [x] Private audit trail; administrators cannot inspect another user's reading data.
- [x] Explicit user-requested complete local publication: 158 sources, 123 distinct posts, eight collections; exact repeats linked, all original text and IDs verified. See `19-complete-archive.md`.
- [x] Individual natural-looking generated artwork for all 123 posts, including the three approved samples. Complete unique-file coverage and all 123 article/image HTTP responses verified; mobile/desktop light/dark rendering reviewed. See `21-content-artwork.md`.

## Release operations

- [x] Unit/content tests and real PostgreSQL migration/RLS tests.
- [x] Browser verification of public reading, mobile themes, and real local account workflow.
- [ ] External SMTP delivery or live Supabase verification; neither is required by the user's selected local setup.
- [ ] Production hosting, public deployment, external backup/restore rehearsal, and final editorial sign-off.

The local site is the deliverable. The final verification record lists exact commands, results, and any skipped environment-specific tests.
