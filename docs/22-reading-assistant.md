# Local reading assistant

The public reader now offers **کمک کن پیداش کنم** on every page. It opens a keyboard-accessible dialog (mobile bottom sheet / desktop panel), accepts a Persian description and an optional collection, and returns up to three published posts with exact source excerpts and paragraph links. Escape closes the dialog and restores focus. It does not generate statements or quotations on behalf of the author.

## Runtime

- Lexical retrieval normalizes Persian letters/numbers, removes common conversational words, expands a small set of synonyms, tolerates one-character spelling errors, and recognizes episode numbers.
- Semantic retrieval uses `Xenova/multilingual-e5-small`, quantized ONNX on the server CPU through Transformers.js. Both passage and query embeddings run locally. No Google key is required.
- The model is cached in `.local/search/models`; content-addressed passage vectors live in `.local/search/index.json`. These files are excluded from Git. The lockfile pins the installed runtime dependencies; the model currently uses the upstream default revision.
- Retrieval combines lexical and semantic ranks. The semantic acceptance threshold is a heuristic calibrated on sample queries, not a probability or a guarantee of relevance.
- Every request reads the current published projection. New/changed passages are embedded incrementally; unpublished posts cannot enter results from an old index.
- Inference is serialized and its queue is bounded. If model loading fails or exceeds the response budget, lexical search stays available and the interface reports the limitation. Cold startup and large reindexing can exceed that budget.
- Runtime model downloads are disabled. Only the explicit preparation command enables downloads. No external model API receives the reader's query.

## Setup on another computer

Run the website, then from the project root:

```powershell
pnpm local:search
pnpm local:search:check
```

The first command downloads approximately 135 MB of model/tokenizer files and indexes the currently published archive. It requires internet access once. The second reads the local catalog, then forbids network requests while checking fresh local inference and source-backed retrieval. Model/data cache files are local artifacts, so a fresh checkout needs this preparation step.

If pnpm is unavailable but project dependencies are already installed:

```powershell
node node_modules/tsx/dist/cli.mjs tools/prepare-search.ts
```

## Verification

`tests/assistant.test.ts` covers normalization, synonyms, spelling, episode constraints, irrelevant queries, semantic thresholds, exact excerpts, deduplication, and missing posts. `tests/e2e/assistant.spec.ts` covers mobile interaction, input validation, public-source results, focus restoration, and paragraph navigation. `local:search:check` checks actual offline inference separately; unit tests do not download a model.

Sources: [model card](https://huggingface.co/Xenova/multilingual-e5-small), [Transformers.js](https://github.com/huggingface/transformers.js).

Verified on 2026-10-05: typecheck, lint, changed-file formatting, Astro/Next production builds, the five retrieval unit cases and two new browser tests passed. The actual cached-model offline check passed. Axe reported zero violations inside the tested assistant dialog; mobile/light and desktop/dark screenshots are in `docs/verification/assistant-*.png`. Warm sample queries completed in roughly 0.75–0.9 seconds on this machine. These sample checks do not establish a corpus-wide relevance percentage.

Audio work was explicitly deferred by the user. No audio generation, player, or Google integration is included in this change.
