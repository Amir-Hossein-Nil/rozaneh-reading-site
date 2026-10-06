# Complete local archive publication

On 2026-10-02 the user requested all posts from both JSON files, ordered and categorized, on the local site. This supersedes the previous sample-only local publication decision. It does not authorize public deployment, rewriting originals, inferring missing dates/numbers, or creating replacement media.

| Collection | Distinct posts |
| --- | ---: |
| اعتقادات روشن | 24 |
| ردپای حضرت | 27 |
| زندگی با امیردل‌ها | 24 |
| فلسفه اشک | 14 |
| کتاب و منابع | 8 |
| گفت‌وگوها و درس‌ها | 6 |
| مناسبت‌ها و اهل‌بیت | 14 |
| زندگی و تأمل | 6 |
| Total | 123 |

The files contain 154 main and four supplemental records. Exact text equality identifies 35 repeat records. All 158 IDs remain in immutable source records and are linked to the 123 posts; the public projection lists the duplicate IDs too. Near matches with different original text are retained separately. Neither normalization nor similarity silently deletes a version.

Original episode numbers are read from headers, including Persian ordinals. Missing numbers remain null. Two different articles numbered 52 in the Ali collection and two numbered 56 in the beliefs collection retain those numbers. Navigation uses a unique, separate reading order: numbered posts ascend by original number, ties use stable source identity, unnumbered material follows numbered episodes. The introduction to Philosophy of Tears precedes its ten numbered days. This ordering is a presentation decision, not a claim about missing publication chronology.

Migration `202610020010_complete_archive.sql` removes the incompatible unique episode-number constraint while retaining unique collection reading order. Source-link validation permits exact copies with independent IDs only when both dataset and original text match. Immutable editorial source IDs remain unchanged; public provenance is derived from the verified links.

`pnpm content:publish <main.json> <supplemental.json>` creates a preview. `--apply` uses the administrator API with genuine sign-in, CSRF protection, source review, recorded duplicate decisions, source links, revisions, and publication. Credentials come from private `.local/development-account.json`, or `LOCAL_ADMIN_FILE` pointing to an equivalent private operator file. No credentials appear in logs. The command signs out afterward. It is resumable and preserves existing post IDs/slugs, bookmarks, and reading history.

The final command was rerun successfully without increasing the post count. Each run verified that every input ID maps to exactly one public post with byte-for-byte equal original text. The full source-to-post receipt is saved privately in `.local/full-archive-report.json`. Missing media is identified separately on the affected reading pages; no attachment is invented.

Additional automated tests cover ordinal parsing, exact duplicate consolidation, repeated episode numbers, immutable payloads, public source-ID projection, and refusal to link different source text. Browser verification covers all eight collection counts and all 123 article routes.
