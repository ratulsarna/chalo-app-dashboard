# ExecPlan: Documentation Module (Render `content/docs/**` under `/docs`)

## Purpose / Big Picture

Add a new first-class “Docs” entry point to the dashboard that renders the checked-in documentation snapshot under `content/docs/**` as a browsable documentation experience (not the analytics-style “diagram panel” UI).

Primary proof it works:
- `pnpm dev` → open `/docs` → you can browse Overview + Feature docs, and markdown renders (tables, lists, links, Mermaid).
- Missing/incomplete docs do not break navigation; they show a clear “Coming soon / missing file” placeholder.
- New docs files added under `content/docs/**` can be picked up by the UI with minimal-to-no code changes (at least for additional pages within a feature).

Non-goals (for this ExecPlan):
- No docs “updater pipeline” work.
- No external CMS / database; everything is read from the filesystem snapshot.

## Progress

- [ ] Implement docs filesystem adapter (`src/lib/docs/*`).
- [ ] Add docs UI routes under `src/app/(protected)/docs/*`.
- [ ] Add docs search (API + UI).
- [ ] Add global nav link in `src/components/site-header.tsx`.
- [ ] Validation pass (`pnpm test`, `pnpm lint`, `pnpm build`) + manual route QA.

## Decision Log (initial recommendations)

Resolved from user answers on **2026-01-15** (`1a 2a 3a 4a 5a`).

- Decision: Docs live at `/docs` and are behind auth (under `src/app/(protected)/docs`).
  Rationale: Matches current “internal dashboard” posture and existing `/analytics` protection model.
  Date: 2026-01-15

- Decision: Route slugs use the **catalog keys** (feature keys and overview keys), not folder names, with `content/docs/feature-slug-map.json` used to resolve folder differences.
  Rationale: Keeps URLs stable and semantic even if folder names change.
  Date: 2026-01-15

- Decision: Mermaid renders inline in markdown (using the existing Mermaid renderer), but the docs UI does not use the analytics “diagram preview/panel” pattern.
  Rationale: Docs are a reading-first experience; diagrams are just part of the content.
  Date: 2026-01-15

- Decision: `/docs` is a “Docs home” page (Overview + Features sections), not a redirect.
  Rationale: Gives a stable, discoverable entry point while docs remain incomplete.
  Date: 2026-01-15

- Decision: Docs pages include a right-rail in-page table of contents (TOC).
  Rationale: Many docs are long; readers benefit from quick intra-page navigation.
  Date: 2026-01-15

- Decision: MVP docs search is a sidebar filter over navigation (catalog `name` + `description`).
  Rationale: Fast, simple, zero-API; avoids loading all markdown content eagerly.
  Date: 2026-01-15

- Decision: Feature doc URLs use `/docs/features/<featureKey>/<docKey>`.
  Rationale: Clear IA boundary and future-proofing for more feature pages.
  Date: 2026-01-15

## Context and Orientation

### Current state

- The app currently renders only analytics docs from `content/analytics/**` under `/analytics`.
  - Data owner: `src/lib/analytics/fs-source.ts` (server-only filesystem adapter) and related modules in `src/lib/analytics/*`.
  - UI routes: `src/app/(protected)/analytics/*`.
  - Mermaid rendering exists as client components under `src/components/analytics/*` (e.g., `src/components/analytics/mermaid-block.tsx`).

- A docs snapshot already exists on disk under `content/docs/**`:
  - Catalog: `content/docs/catalog.json` (overview + features metadata).
  - Slug mapping: `content/docs/feature-slug-map.json` (folder slug → catalog key when they differ).
  - Markdown content:
    - Overview docs: `content/docs/overview/*.md`
    - Feature docs: `content/docs/features/<folder>/*.md` (e.g., `hld.md`, `components.md`, etc.)

- Types are partially defined for docs, but there is no adapter/UI yet:
  - `src/lib/docs/types.ts`

### Target UX (high-level)

A “docs site” layout:
- Left sidebar: navigation tree (Overview + Features), filter/search, status badges.
- Main content: markdown renderer optimized for reading (headings, tables, code, callouts).
- Optional right rail: on-page table-of-contents (generated from headings) for long docs.

### Terminology

- **Catalog key**: The key in `content/docs/catalog.json` (e.g., feature key `help`, overview key `tech-stack`).
- **Feature folder slug**: The folder under `content/docs/features/<folderSlug>/`; may differ from catalog key and is reconciled via `feature-slug-map.json`.
- **Doc page**: A rendered markdown file (overview doc or a feature doc like `hld.md`, `components.md`, etc.).
- **Frontmatter**: YAML-like header at the top of markdown between `---` fences (present in many docs).

## Research

### Internal patterns to reuse (files inspected)

- Analytics filesystem adapter patterns:
  - `src/lib/analytics/fs-source.ts` (server-only reads, path traversal prevention, `cache()` usage).
- Analytics route/layout patterns:
  - `src/app/(protected)/analytics/layout.tsx` (fetch snapshot server-side, pass into a shell).
  - `src/components/site-header.tsx` (global header nav links).
- Markdown + Mermaid rendering already in the app:
  - `src/components/analytics/flow-diagram-markdown.tsx` (react-markdown + remark-gfm + mermaid code block handling).
  - `src/components/analytics/mermaid.ts` and `src/components/analytics/mermaid-block.tsx` (client rendering with `securityLevel: "strict"`).
- Docs content and schema:
  - `content/docs/catalog.json`
  - `content/docs/feature-slug-map.json`
  - Example docs: `content/docs/features/help/hld.md`, `content/docs/overview/tech-stack.md`
- Existing docs types:
  - `src/lib/docs/types.ts` (needs small extensions for actual frontmatter keys seen in content).

### Styling note discovered during research

- Markdown rendering in analytics uses `prose ... dark:prose-invert` classes (see `src/components/analytics/flow-diagram-markdown.tsx`), but this repo does **not** currently declare the Tailwind Typography plugin in CSS (no `@plugin "@tailwindcss/typography";` found in `src/app/globals.css`).
- For a docs module (reading-first), we will explicitly add and enable `@tailwindcss/typography` (see “Interfaces and Dependencies” and “Plan of Work”).

### Baseline “before” verification

From repo root:
```bash
pnpm dev
```

Observed before this change:
- `/analytics` renders.
- `/docs` returns 404 (no route).

## Open Questions (User Clarification)

None (resolved on 2026-01-15: `1a 2a 3a 4a 5a`).

## Test Specification (write failing tests first)

This repo uses Node’s built-in test runner: `pnpm test` → `node --test`.

### New unit tests to add

Add tests as `*.test.js` under `scripts/docs/test/` (keeps consistent with existing test layout).

Important constraint for tests:
- Files like `src/lib/analytics/fs-source.ts` use `import "server-only";`, which **does not resolve** when directly imported via `node` outside Next.js (today it errors: “Cannot find package 'server-only'…”).
- Therefore, for docs we will keep filesystem access in a server-only adapter file, but we will extract the unit-testable logic into **pure helper modules** that do not import `server-only`.

1) Catalog normalization builds a stable snapshot model
   - Define a pure function (e.g., `buildDocsSnapshotFromCatalogFile(catalogFile, slugMapFile)` in `src/lib/docs/snapshot.ts`) that returns:
     - `features` array with all catalog features (sorted deterministically).
     - `overviews` array with all catalog overview docs (sorted deterministically).
     - `featuresBySlug` and `overviewsBySlug` keyed by catalog key.
   - Ignores catalog keys starting with `_` (if we adopt the same convention as analytics slug maps).

2) Feature folder resolution honors `feature-slug-map.json`
   - If the catalog key differs from folder slug (via slug map), loader resolves the correct folder.
   - If no mapping exists, default folder slug is the catalog key.

3) Path resolution rejects traversal / escaping roots
   - Attempts like `../` in feature keys or doc keys are rejected (throw a clear error).
   - Unit-test the pure resolver (e.g., `resolveFeatureDocPath({ featureFolderSlug, docKey })`) by asserting it throws on bad inputs and produces an expected relative path on good inputs.

4) Frontmatter parsing (minimal YAML subset)
   - Correctly strips frontmatter and returns raw markdown body.
   - Supports:
     - strings, `null`, booleans
     - simple arrays like `[android, ios, shared]`
   - Unknown keys are preserved in the parsed object (don’t crash).

5) Search behavior (pure function, unit-testable)
   - `searchDocsSnapshot(snapshot, query)`:
     - Empty/whitespace query returns `[]`.
     - Matches case-insensitive substring against catalog `name` and `description` (MVP).
     - Returns stable sorting (more match fields first, then name).
     - Does not require reading markdown content.

## Plan of Work

### Milestone 1 — Docs data owner (`src/lib/docs/*`)

1) Extend/adjust types (small, surgical)
   - Update `src/lib/docs/types.ts`:
     - Expand `DocsFrontmatter` to include keys already used in content (e.g., `slug`, `layer`, `analyticsFlowSlug`), or change it to `Record<string, unknown>` + a typed subset.
     - Ensure all existing type exports remain compatible.

2) Add a server-only filesystem adapter similar to analytics
   - Create `src/lib/docs/fs-source.ts` with:
     - Root constants:
       - `DOCS_ROOT = path.join(process.cwd(), "content", "docs")`
       - `DOCS_FEATURES_ROOT = path.join(DOCS_ROOT, "features")`
       - `DOCS_OVERVIEW_ROOT = path.join(DOCS_ROOT, "overview")`
     - Safe resolvers that prevent escaping these roots (same “resolve then startsWith” strategy as `src/lib/analytics/fs-source.ts`).
     - Functions (names can vary, but must exist in `src/lib/docs/index.ts`):
       - `getDocsSnapshot(): Promise<DocsSnapshot>`
       - `readOverviewDoc(overviewSlug): Promise<DocsOverview>` (returns placeholder/`exists=false` if missing)
       - `readFeatureDoc(featureSlug, docKey): Promise<{ content: string; frontmatter?: ...; exists: boolean }>`
       - Optional convenience: `readFeature(featureSlug): Promise<DocsFeature>` (loads `hld` + known LLDs, marks missing)
     - Use `cache()` for snapshot-level reads (consistent with analytics) so UI routes are fast and stable per request.

3) Add docs search utilities
   - Add `src/lib/docs/search.ts`:
     - `searchDocsSnapshot(snapshot, query)` returning a list of hits (features + overviews).
     - Keep it pure (no fs) so it is unit-testable.

4) Export a public “docs” module surface
   - Add `src/lib/docs/index.ts` exporting the adapter functions and types used by routes.

### Milestone 2 — Docs routes + layout (`src/app/(protected)/docs/*`)

1) Add a docs segment with its own layout shell
   - Create `src/app/(protected)/docs/layout.tsx`:
     - Load `getDocsSnapshot()`.
     - Pass navigation data into a new `DocsShell` component.

2) Add docs landing page
   - Create `src/app/(protected)/docs/page.tsx`:
     - Render:
       - “Overview” cards (name/description/status).
       - “Features” table or card grid (name/description/platforms/status; link to feature page).
     - This page should be useful even when content is incomplete.

3) Add overview doc pages
   - Create `src/app/(protected)/docs/overview/[overviewSlug]/page.tsx`:
     - Use `readOverviewDoc()` to load markdown.
     - Render markdown with `DocsMarkdown` component.
     - If missing, render a “Coming soon” placeholder and show catalog metadata.

4) Add feature doc pages (HLD + LLD + future extra pages)
   - Create:
     - `src/app/(protected)/docs/features/[featureSlug]/page.tsx` (feature landing; link to `hld` and available subpages)
     - `src/app/(protected)/docs/features/[featureSlug]/[docKey]/page.tsx` (renders `<docKey>.md` in the feature folder)
   - Behavior:
     - If the markdown file doesn’t exist, show a placeholder (“Doc not written yet”) and a list of available docs for that feature.
     - If `hasAnalyticsFlow`, show a prominent link to `/analytics/flows/<analyticsFlowSlug>`.

### Milestone 3 — Markdown renderer (reading-first)

1) Create a reusable markdown component for docs
   - Add `src/components/docs/docs-markdown.tsx` (or `src/components/markdown/markdown.tsx` if we want it shared).
   - Use:
     - `react-markdown` + `remark-gfm`
     - Custom renderer:
       - Render fenced `mermaid` blocks via the existing Mermaid components (`src/components/analytics/mermaid-block.tsx`), but with docs-appropriate framing (no “expand sheet” unless explicitly desired).
       - Render internal links (`/docs/*`, `/analytics/*`) via `next/link` for better SPA navigation.
       - Render tables with scroll affordance on narrow screens.

2) Typography styling
   - Add Tailwind Typography plugin:
     - Add `@tailwindcss/typography` to dependencies.
     - Enable it in `src/app/globals.css` via `@plugin "@tailwindcss/typography";`.
   - Standardize docs markdown container classes to:
     - `prose prose-zinc max-w-none dark:prose-invert`
   - Ensure tables are horizontally scrollable on small screens (either via plugin defaults + wrapper, or via a small wrapper class on `table`).

3) (If chosen) Right-rail table of contents
   - Add a small heading extractor (pure function) that scans markdown for `##`/`###` headings and builds a TOC model.
   - Render TOC in `DocsShell` or per-page layout, with anchor links.

### Milestone 4 — Docs search
1) Add sidebar nav filtering (client-side)
   - Implement a simple `<Input>` in the docs sidebar that filters:
     - Overview items by `name` + `slug`
     - Feature items by `name` + `slug`
   - (Optional for later) Add content search via an API route only if/when needed.

### Milestone 5 — Wire into global navigation

- Update `src/components/site-header.tsx` to include a “Docs” link alongside “Analytics”.

## Concrete Steps (commands)

Run from repo root (`/home/ratul/Developer/chalo/chalo-app-dashboard`):

1) Run tests (should fail before docs adapter exists, then pass)
```bash
pnpm test
```

2) Run lint
```bash
pnpm lint
```

3) Run a production build
```bash
pnpm build
```

4) Manual UI verification
```bash
pnpm dev
```
Then open:
- `/docs`
- `/docs/overview/tech-stack`
- `/docs/features/help/hld`
- `/docs/features/help/components`
- A missing doc (choose a feature lacking `components.md`) → verify placeholder

## Validation and Acceptance

Acceptance is met when:
- Navigation:
  - `SiteHeader` shows a “Docs” link.
  - `/docs` loads and shows Overview + Features derived from `content/docs/catalog.json`.
  - Sidebar navigation reflects catalog entries and routes correctly.
- Rendering:
  - Markdown renders with readable typography, tables, and code blocks.
  - Mermaid code blocks render as diagrams (or degrade gracefully with source shown on render error).
- Incomplete content:
  - Missing markdown files do not crash; placeholders render with helpful context.
- Quality gates:
  - `pnpm test` passes (including new docs tests).
  - `pnpm lint` passes.
  - `pnpm build` passes.

## Idempotence and Recovery

- All steps are safe to rerun.
- If a route or adapter change breaks build/lint, revert the last commit/file change; no migrations or external state are involved.

## Interfaces and Dependencies

### New/updated module surface (`src/lib/docs/index.ts`)

At minimum, export:
- `getDocsSnapshot(): Promise<DocsSnapshot>`
- `readOverviewDoc(overviewSlug: string): Promise<DocsOverview>`
- `readFeatureDoc(featureSlug: string, docKey: string): Promise<{ content: string; exists: boolean; frontmatter?: Record<string, unknown> }>`
- `searchDocsSnapshot(snapshot: DocsSnapshot, query: string): DocsSearchHit[]` (or similar)

### Dependencies

Reuse existing dependencies:
- `react-markdown`, `remark-gfm` for markdown
- `mermaid` + existing client renderer for diagrams

Add one dependency for typography:
- `@tailwindcss/typography` (required for `prose` classes used by docs markdown).

Only add other dependencies if required for markdown/frontmatter parsing, and record the rationale in `Decision Log`.

## Artifacts and Notes

Expected route map (proposed):
- `/docs` (landing)
- `/docs/overview/<overviewSlug>`
- `/docs/features/<featureKey>` (feature landing)
- `/docs/features/<featureKey>/<docKey>` (renders `<docKey>.md`; `hld` maps to `hld.md`)

## Plan Revision Notes

Append-only, newest-last.

- 2026-01-15: Resolved Open Questions (`1a 2a 3a 4a 5a`), updated Decision Log, clarified MVP search as sidebar filter (no command palette/API), and committed to Tailwind Typography plugin for docs markdown styling.
- 2026-01-15: Updated Test Specification to avoid importing `server-only` modules in `node --test`; tests now target pure helper modules (frontmatter parsing, path resolution, catalog snapshot building, search).
