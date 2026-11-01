# My Recipe Collection — Phase 1 (0.2)

A private, Hebrew mobile recipe feed for Amit. The static 0.1 application has been preserved as the browser interface in `public/` and is served by a Sites Vinext Worker. Existing IndexedDB data and the app origin are unchanged.

## Implemented

- Recipe feed with photos, two-line descriptions, source, categories, tags and actual known metadata.
- Keep ZIP/JSON/HTML import preserving text, labels and first attached image. Select notes by label or name, edit before import and skip exact duplicates.
- Website recipe import using Recipe JSON-LD, including the source image. When only an accessible social caption is available, save it with the original link. Blocked sites require pasted text; no video transcription.
- Text paste and image upload. An uploaded image is preserved as a scan/cover; ingredients and steps are entered manually in phase 1.
- Personal 1–5 ratings, favorites, collections, cooking notes, quantity scaling, step-by-step cooking, foreground timer, shopping checklist and weekly plan.
- Optional rules-based natural language search: ingredient aliases, `בלי`/`ללא` exclusions and `עד 40 דקות`. This is not model-based semantic search.
- Explicitly rules-based checks for missing quantities/servings, duplicate ingredients, missing oven temperature and completion criteria. This is not a culinary correctness certification.
- Share text, portable recipe HTML, JSON backup, or a cloud collection link.
- D1-backed shared collections, subscriptions and shared-recipe ratings. Only selected shared recipes are uploaded; private cooking notes, raw notes, personal ratings and edit history are stripped from shared copies.
- PWA app shell, local persistence and backups. Actual Android installation, share targets and offline authentication behavior still require phone testing.

## Phase 2 — deferred by the user

AI photo generation, OCR, recipe analysis/improvement and web search with AI are not active. No provider key or paid AI call is configured. Missing recipe images remain empty or can be uploaded manually. Future generated images must be labeled as illustrations, preserve existing source photos by default and never be presented as photographs of the actual prepared recipe.

## Development

Use the Sites-managed dependency installer/build workflow. The project uses pnpm. Source files are in `public/`, `app/`, `server/`, and `db/`; `dist/` is generated.

```sh
npm run check
npm test
npm run db:generate
```

Generate and inspect append-only Drizzle migrations. Local migrations and hosted migrations are separate. Publication applies hosted migrations. Do not replay local migration files. `sites-preview start /workspace/sites/matkon-amitz` runs the managed preview; managed preview does not mock authenticated identities. Server ownership/subscription/rating tests use an isolated SQLite fixture, not production data.

## Access and data

The site keeps its custom private audience. The work owner and the explicitly added Gmail visitor can sign in. A link to a shared collection does not bypass the site's sign-in/access policy. Additional people need their own visitor access. Portable HTML and text can be sent to people who have no account.

Private recipes remain local to a browser/device; sharing selected collections is not full library sync. Existing work and Gmail identities may own different cloud collections. A saved copy from somebody else's collection is independent and never overwritten by their updates. To publish your later changes, update the shared snapshot explicitly.

## Boundaries

Keep has no ordinary consumer OAuth integration here. Import uses Google Takeout. Additional images, drawings/audio and multi-ZIP attachment joining are not supported. Some sites block import. Website fetches are HTTPS-only with size/time/redirect limits and private-address/DNS checks. API writes require platform identity, same-origin requests and resource ownership.

The app's download timestamp indicates download initiation, not independent verification of an external backup. Background alarms and native APK have not been implemented.

## Credits

See `docs/ASSETS.md`, the JSZip MIT license and bundled SIL font licenses. Demo images are illustrative stock photographs.
