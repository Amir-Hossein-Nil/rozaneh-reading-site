# Natural artwork for every post

The user approved the three natural sample images and requested an individual emotional, creative, natural-looking photograph for every remaining post. These are AI-generated thematic illustrations; they are not historical photographs, photos of actual source events, or portraits of religious figures.

There are 123 public posts. Exact repeat source records remain linked to one post; distinct source texts each receive their own asset. Art direction varies by subject, setting, viewpoint, light and emotion. The source text and IDs are unchanged. Previous reference collages and earlier CGI concept samples are retained as archives rather than reused for the new natural series.

- Current coverage: `docs/artwork/progress.json` (updated when assets are installed).
- Per-post art direction: `docs/artwork/direction.json`.
- Full generation prompts and resumable receipts: `.local/artwork/plan.json` and `.local/artwork/receipts/`.
- Original generated PNGs: `output/imagegen/posts/`.
- Production WebP files: `apps/reader/public/images/posts/natural-*.webp`.
- Shared image manifest: `apps/reader/src/data/post-artwork.json`.

Generation uses the built-in image_gen tool, one call per post. `node tools/artwork/install.mjs` copies completed tool outputs into the workspace, optimizes delivery files, validates asset names, and updates the manifest atomically. It does not generate images or require an API key. Missing images remain explicitly pending in the coverage report. `node tools/artwork/plan.mjs` prepares a resumable plan from the local catalog and individually reviewed art directions; it never publishes or alters source content.

The images are consumed by the homepage suggestion, full reading page and related cards. Titles/buttons are live HTML. Persian descriptions, source identity and image dimensions are kept separate from the immutable database editorial payloads.

## Verification and maintenance

With the local website running at `http://localhost:3200`, run:

```powershell
node tools/artwork/verify.mjs --complete
node tools/artwork/verify-served.mjs
```

The first command verifies complete coverage, unique file hashes, metadata dimensions, nonempty Persian descriptions and production file size. The second requests every article and its image from the local website, checks that the page renders the assigned asset, and compares the delivered image bytes with the installed file. Results are saved in `artwork/verification.json` and `artwork/served-verification.json`.

`node tools/artwork/contact-sheet.mjs 0` creates a visual review sheet for the first 12 installed assets. Repeat with offsets 12, 24, and so on. Review sheets are saved under `verification/artwork/`. Original images are retained; only delivery copies are optimized. Update the receipt's `position` and rerun the installer to adjust a crop; meaningful Persian descriptions are maintained in `apps/reader/src/data/post-artwork-descriptions.json`.

## Completed verification — 2026-10-02

- Installed 123 individual natural-style images for 123 public posts. All three approved samples were retained. Zero posts are pending; all source texts and IDs remain unchanged.
- `verify.mjs --complete`: 123 distinct WebP hashes, correct dimensions, Persian descriptions and acceptable file sizes.
- `verify-served.mjs`: all 123 local article pages render their assigned image; every image response matches its installed file byte for byte.
- Reviewed all 123 assets on 11 contact sheets, plus representative homepage/article/related-card views at mobile and desktop sizes. Related images were explicitly scrolled into view and decoded to verify lazy loading.
- Unit/content/PostgreSQL tests: 22 passed. Final public reading and visual/accessibility browser tests: 5 passed, including light/dark modes at 390px and 1440px. An earlier accessibility run was interrupted by development-server reloads during manifest installation; the final run after installation passed.
- TypeScript, ESLint and formatting checks passed. Production builds of both Astro and Next.js passed.
- The local website remains available at `http://localhost:3200`; use `pnpm dev` to restart it. No public deployment was performed.
