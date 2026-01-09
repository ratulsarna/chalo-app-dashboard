# ExecPlan: Analytics Dashboard MVP (Browse + Search + Diagrams)

## Purpose / Big Picture

Deliver a working “Analytics” module inside `chalo-app-dashboard` that lets PMs and engineers:

1) Browse analytics **flows** and view each flow’s **events** and **property definitions**.
2) Perform global **partial** search across events by `name`, `stage`, and `component`.
3) View a **canonical event** page that aggregates all occurrences of the same emitted event string across flows.
4) View flow diagrams **inline** (render Mermaid from `content/analytics/**/flow-diagrams.md`).

Primary proof it works:

- `pnpm dev` → open `/analytics/flows` and click into a flow → you see property definitions, event rows (including description + properties used), and rendered Mermaid diagrams.
- Open `/analytics/events?q=search` → you see results with links to both the flow occurrence and the canonical event page.
- Open `/analytics/events/<eventName>` → you see the event and a table of all occurrences across flows.

## Progress

- [x] (2026-01-09) Bootstrapped Next.js + shadcn/ui + Convex skeleton (`src/app`, `src/components/ui`, `convex/`).
- [x] (2026-01-09) Imported analytics snapshot into `content/analytics/` (all flows).
- [x] (2026-01-09) Added filesystem analytics adapter + flows/events pages (merged in PR #1).
- [x] (2026-01-09) Resolved ExecPlan open questions (`defaults`).
- [ ] Add canonical event pages and link integration.
- [ ] Render Mermaid diagrams inline on flow detail page.
- [ ] Show event details (description, properties used) on flow detail page.
- [ ] Add unit tests for adapter utilities and markdown parsing (or document manual verification if test infra is deferred).

## Surprises & Discoveries

- The folder slug under `content/analytics/<slug>/` is **not** the same as `flowId` in `events.json` (e.g., folder `instant-ticket-purchase/` contains `flowId: instant_ticket_purchase`).
- `content/analytics/flows.json` appears to be a separate, semantic catalog and does not map 1:1 to folder slugs; the current adapter uses folder slugs as the routing key.
- `events.json.diagram` exists but is not guaranteed to match `flow-diagrams.md`; `flow-diagrams.md` is treated as the display-first diagram source for MVP.

## Decision Log

- Decision: Treat emitted event strings as case-sensitive exact keys.
  Rationale: The strings must match what analytics dashboards use; normalization risks drift.
  Date/Author: 2026-01-09 / ratul + agent

- Decision: Keep property keys exact (including spaces).
  Rationale: Prevent lookup mismatch with downstream analytics.
  Date/Author: 2026-01-09 / ratul + agent

- Decision: Store per-flow occurrences as the primary display unit; provide a canonical event page that aggregates occurrences.
  Rationale: Events repeat across flows (not a 1:1 parent-child relationship).
  Date/Author: 2026-01-09 / ratul + agent

- Decision: Render full `flow-diagrams.md` markdown, with Mermaid code blocks rendered inline.
  Rationale: Keeps the existing docs readable (headings/notes/guides) while making diagrams interactive.
  Date/Author: 2026-01-09 / ratul

- Decision: Canonical event URL is `/analytics/events/[eventName]` where `[eventName]` is `encodeURIComponent(eventName)`.
  Rationale: Simple, debuggable, and preserves the exact event string in the URL.
  Date/Author: 2026-01-09 / ratul

- Decision: Flow detail event table includes `description` + “properties used” (in addition to name/stage/component).
  Rationale: Matches MVP needs for PM/engineer exploration without requiring secondary drawers/modals.
  Date/Author: 2026-01-09 / ratul

- Decision: Do not add a new unit test runner for MVP; rely on `pnpm lint`, `pnpm build`, and manual verification of routes.
  Rationale: Repo currently has no test harness; MVP is UI-heavy and can be validated via deterministic pages and builds.
  Date/Author: 2026-01-09 / ratul + agent

## Outcomes & Retrospective

TBD after MVP completion.

## Context and Orientation

### Repository overview

This repository is a Next.js (App Router) project with:

- UI: Tailwind + shadcn components in `src/components/ui/*`
- Analytics module routes under `src/app/analytics/*`
- Analytics data snapshot checked in under `content/analytics/*`

Key existing files (current “owners”):

- Filesystem analytics source + snapshot builder:
  - `src/lib/analytics/fs-source.ts`
  - `src/lib/analytics/types.ts`
  - `src/lib/analytics/search.ts`
  - `src/lib/analytics/urls.ts`
  - `src/lib/analytics/index.ts`
- Analytics routes:
  - `src/app/analytics/page.tsx` (landing)
  - `src/app/analytics/flows/page.tsx` (flows index)
  - `src/app/analytics/flows/[flowSlug]/page.tsx` (flow detail)
  - `src/app/analytics/events/page.tsx` (global search)
  - `src/app/analytics/error.tsx` (segment error boundary)
- Data:
  - `content/analytics/<flowSlug>/events.json`
  - `content/analytics/<flowSlug>/flow-diagrams.md`

### Terminology

- **Flow**: A product journey area (e.g., Search, Payment). In this repo, the route key is the folder name (`flowSlug`).
- **Event string**: Exact emitted analytics event string (case-sensitive).
- **Occurrence**: A single event definition *in a given flow context* (may repeat across flows; may repeat within a flow).
- **Mermaid**: Text-based diagram language used in `flow-diagrams.md` code blocks.

### Pattern to extend (do not introduce parallel abstractions)

All MVP work should extend the existing analytics “owner” modules:

- Data: extend `src/lib/analytics/*` (add pure helpers; keep filesystem access server-only).
- UI: extend `src/app/analytics/*` pages and add new routes under the same segment.

## Research

### Internal codebase research to perform (repeat when updating this plan)

Run these commands from repo root to confirm current state and patterns:

```bash
pnpm -v
node -v

ls -la content/analytics
find content/analytics -maxdepth 2 -type f | wc -l

sed -n '1,220p' src/lib/analytics/fs-source.ts
sed -n '1,220p' src/app/analytics/flows/[flowSlug]/page.tsx
sed -n '1,160p' src/app/analytics/events/page.tsx
```

### External research to reduce risk (summarize in-plan)

Before implementing Mermaid rendering, confirm:

- `mermaid` NPM package supports client-side rendering to SVG in a browser context.
- “Strict” rendering mode is available to reduce injection risk (even though this is internal).
- A React/Next pattern for rendering Mermaid blocks from markdown (commonly: `react-markdown` + custom code block renderer + dynamic import of `mermaid`).

(Optional) Links for posterity (plan remains self-contained without them):

- Mermaid docs: https://mermaid.js.org/
- `react-markdown`: https://github.com/remarkjs/react-markdown

## Open Questions (User Clarification)

Resolved (defaults accepted).

## Test Specification

### Unit tests (write first)

This repo currently has no automated test runner. For MVP, do not add one.

Instead, treat the items below as *specification targets* and validate via manual steps + `pnpm lint` + `pnpm build`.
If a test runner is added later (Phase 2), implement these as unit tests.

1) `extractMermaidBlocks(markdown: string): string[]`
   - Returns all fenced code blocks labeled `mermaid` (in order).
   - Ignores non-mermaid code blocks.
   - Handles windows newlines and leading/trailing whitespace.

2) `searchAnalyticsOccurrences(snapshot, query)`
   - Case-insensitive substring match on `eventName`, `stage`, `component`.
   - Empty/whitespace query returns `[]`.
   - Stable sorting: more matched fields first; tie-break by `eventName`.

3) `getAnalyticsSnapshot()` invariants (pure-level assertions by factoring logic)
   - Occurrence IDs are unique within a snapshot (especially for repeated events).
   - Path traversal attempts are rejected by `readAnalyticsFlow()` (e.g., `../..`).

## Plan of Work

### Milestone 1: Canonical Event pages

1) Add new route:
   - Create `src/app/analytics/events/[eventName]/page.tsx`.
   - Decode `eventName` from the URL path segment.
   - Fetch the snapshot via `getAnalyticsSnapshot()`.
   - Render:
     - Event name (exact string)
     - Occurrence list table: flow name (link to flow+anchor), stage, component, description, property refs (if present).
   - If no occurrences found, return `notFound()`.

2) Update global search page:
   - In `src/app/analytics/events/page.tsx`, add a “View event” link to canonical event page for each result row.

### Milestone 2: Inline Mermaid diagrams

1) Add markdown rendering component(s):
   - Add a client component under `src/components/analytics/FlowDiagram.tsx` (new directory).
   - Render the full markdown from `flow-diagrams.md` using `react-markdown` and a custom renderer for code blocks:
     - For `language === "mermaid"`, render using a `MermaidBlock` client component.

2) Add Mermaid renderer:
   - Add `MermaidBlock` client component that:
     - Dynamically imports `mermaid`.
     - Initializes once with `securityLevel: "strict"` (or equivalent).
     - Renders SVG into the DOM for a given mermaid code string.
     - Handles errors by displaying a readable fallback (and optionally the source in a `<details>`).

3) Wire into flow detail:
   - Replace the current “Show flow-diagrams.md source” `<pre>` in
     `src/app/analytics/flows/[flowSlug]/page.tsx` with the inline renderer component.
   - Keep an optional “Show source” toggle for debugging.

### Milestone 3: Flow detail event table polish

1) Extend events table to show:
   - `description` (from events.json)
   - `propertiesUsed` list (property key + context)
2) Link property keys to the property definitions section via anchors.

## Concrete Steps

All commands run from repo root.

### Setup / baseline

```bash
pnpm install
pnpm lint
pnpm build
```

### Dev run

Terminal A:

```bash
pnpm dev
```

Open:

- `http://localhost:3000/analytics/flows`
- `http://localhost:3000/analytics/events?q=search`

### Branch + PR workflow

```bash
git checkout main
git pull --ff-only
git checkout -b feat/analytics-mvp
```

Implement milestones, commit frequently, and open a PR:

```bash
git push -u origin feat/analytics-mvp
gh pr create --base main --head feat/analytics-mvp
```

## Validation and Acceptance

### Automated

- `pnpm lint` succeeds.
- `pnpm build` succeeds.
- If unit tests are added: `pnpm test` succeeds (define and document the command).

### Manual acceptance (UI)

1) Flows list works:
   - Visit `/analytics/flows`.
   - Expect a table of flows with counts; click one navigates to `/analytics/flows/<flowSlug>`.

2) Flow detail shows required info:
   - On `/analytics/flows/<flowSlug>`:
     - Property definitions table is visible.
     - Events table shows `name`, `stage`, `component`, and `description` + properties used (once implemented).
     - Mermaid diagrams render inline (not just source text).

3) Global search works:
   - Visit `/analytics/events?q=payment` and `/analytics/events?q=Search`.
   - Expect partial matching across name/stage/component.
   - If results exceed 200, see truncation notice.
   - Each result links to:
     - the flow occurrence anchor, and
     - the canonical event page.

4) Canonical event page works:
   - Click “View event” from a search result.
   - Expect a page listing all occurrences across flows.
   - Clicking an occurrence navigates back to the flow detail and scrolls to the anchored row.

## Idempotence and Recovery

- Adding Mermaid rendering is additive; if issues occur, revert the flow detail integration to “show source” and keep the renderer components behind a feature flag (optional).
- If a new dependency introduces build/runtime issues, rollback by reverting the dependency and keeping markdown as plain text until re-evaluated.

## Artifacts and Notes

- Keep `content/analytics/**` as read-only inputs in MVP.
- Avoid normalizing event strings or property keys; display and search using exact stored strings (case-insensitive search only for user query matching).

## Interfaces and Dependencies

### New helper interfaces (minimal)

- `MermaidBlock` component (client-only):
  - Input: `code: string`
  - Output: inline SVG rendering or an error fallback.

### Dependencies (if selected for MVP)

- `mermaid`
- `react-markdown`
- (Optional) `remark-gfm`

## Plan Revision Notes

- (2026-01-09) Initial ExecPlan created to cover remaining MVP work after PR #1 merged.
- (2026-01-09) Open questions resolved via `defaults` (inline full markdown + Mermaid, canonical event URL shape, richer flow event table, no new test runner for MVP).
