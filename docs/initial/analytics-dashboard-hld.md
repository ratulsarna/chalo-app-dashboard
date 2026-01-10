# Chalo Dashboard — Analytics HLD (Phased)

## Purpose

Build an internal, interactive web app that helps PMs and engineers explore Chalo’s analytics instrumentation:

- Browse flows (journeys) and understand event taxonomy per flow.
- Search across events/properties by **partial match** (not exact-only).

This dashboard will later expand beyond analytics, so the foundation should support additional modules.

## Audience

- PMs: validate instrumentation coverage, understand funnels/journeys, answer “what fires where?”
- Engineers: implement/debug analytics, confirm emitted strings + properties, trace flow context

## Goals (MVP)

### Primary user workflows

1) **Flows-first**
- Pick a flow → view:
  - Flow metadata (name/description/last audited)
  - Event list (name, stage, component/source, description, properties used)
  - Property definitions for that flow

2) **Global search**
- Partial match across:
  - event `name`
  - event `stage`
  - event `component`
  - (optionally) property keys and description text
- Results allow drilling into:
  - a **flow occurrence** (event-in-flow context)
  - the **canonical event** page (one event string aggregated across flows)

### Non-goals (MVP)

- Authentication/authorization (assumed behind Tailscale).
- Admin triage inbox and edit workflows.
- Automated updater pipeline (planned for later phases).

## Key concepts

### Canonical event vs occurrence

Key constraint: the same event string can appear in multiple flows.

- **Canonical Event** = the exact emitted string (case-sensitive, exact match).
- **Event Occurrence** = usage of an event within a specific flow + stage + component/source (context).

The UI should primarily render occurrences (flow context), while enabling a Canonical Event page that
aggregates occurrences across flows.

### Property keys

Property keys must remain **exact** (including spaces/casing). We must not “normalize away” the
real keys, otherwise lookups drift from production analytics.

## Source of truth (filesystem snapshot)

Analytics documentation lives in this repo as a snapshot under `content/analytics/`.

Expected structure:

```
content/analytics/
  flows.json
  <flowSlug>/
    events.json
    flow-diagrams.md
```

### Notes on diagrams

- `flow-diagrams.md` (Mermaid) is the **display-first** artifact.
- Some flows may also contain diagram summaries in JSON; the app should not assume JSON and Markdown match.
- Diagrams should follow the “green node = analytics event string” convention so nodes can be clickable.

## Data model (conceptual)

### Analytics Snapshot

UI reads from an in-memory **Analytics Snapshot** produced by a source adapter:

- `flows[]` (catalog + metadata)
- `occurrences[]` (flattened occurrences across flows)
- derived indexes:
  - canonical event → occurrences
  - flow → stages → occurrences
  - property → occurrences that use it

This allows swapping storage (filesystem now, DB later) without rewriting UI routes/components.

## Architecture

### Web app

- Next.js (App Router) + TypeScript
- Tailwind + shadcn/ui
- Convex can be introduced later; MVP can stay read-only from the filesystem snapshot

### Data access strategy

Use a “source adapter” boundary:

- **Filesystem adapter:** reads `content/analytics/**`, parses JSON/Markdown, builds snapshot.
- **DB adapter (later):** reads imported/normalized data, builds the same snapshot shape.

## UI (MVP)

### Routes

- `/analytics` (landing)
- `/analytics/flows` (flows index)
- `/analytics/flows/[flowSlug]` (flow detail)
- `/analytics/events` (global search + event index)
- `/analytics/events/[eventName]` (canonical event detail)

### Search behavior

- Partial match (substring) over event name/stage/component.
- Prefer event-name matches for short queries in global search (so “checkout” works as expected).
- Stable sorting: best match → deterministic tie-breakers.

## Phases (no timelines)

Each phase should preserve the UX surface and evolve internals behind stable interfaces.

### Phase 0 — Read-only dashboard (filesystem-backed)

Scope:
- `content/analytics/**` is the source of truth.
- Server-only adapter builds the Analytics Snapshot.
- Flows browse + Flow detail + Canonical Event pages + Global search.
- Diagrams: diagram selector + pan/zoom/fit; green nodes open an event sheet (no navigation).

Exit criteria:
- PM can answer: “what fires in this flow?”, “where does this event fire?”, “what props does it send?”

### Phase 1 — Content hardening + UX polish

Scope:
- Improve ingestion robustness (schema drift across flows, missing optional fields, graceful fallbacks).
- Validation + clearer error surfacing for corrupt artifacts.
- Deep-linking consistency (`?tab=events&open=<occurrenceId>` patterns) and dismissible sheets.
- Accessibility (keyboard navigation, focus management for dialogs/sheets).

Normalization rules (filesystem adapter):
- Treat event `name` as exact, but trim leading/trailing whitespace if present (record a warning).
- Stage field fallback: `event.stage` → `event.funnelPosition`.
- Component field fallback: `event.component` → `event.firingLocation` (when docs store code callsite paths).
- Properties list normalization:
  - accepts `["propKey", ...]`
  - accepts `[{ property, context }, ...]`
  - accepts `[{ name, required, description }, ...]` and converts to `{ property, context }`.
- Property definitions normalization:
  - tolerate extra keys (`constant`, etc.)
  - if `type` is missing/invalid, set to `"unknown"` and record a warning.
- Corrupt JSON never breaks the entire dashboard; it yields localized “docs issues” with best-effort fallback data.

Exit criteria:
- Partial/broken docs do not break the whole app; issues are localized and actionable.
- Deep links are shareable and predictable.

### Phase 2 — Automated updater pipeline (git watcher + LLM agent)

Goal: keep `content/analytics/**` continuously up to date with the upstream app repo (`chalo-app-kmp`)
without manual sweeps.

#### Design principles

- **No AST-only extraction step.** The pipeline is LLM-driven with tool-assisted repo exploration
  (search/grep/navigation) because events can live anywhere and conventions are not reliable.
- **Diff-first:** constrain the agent to changes since the last processed commit (plus required context).
- **PR-based:** never push directly to `main`; always open a PR with a clear audit summary.
- **Deterministic validation:** run schema + integrity checks before opening a PR.

#### Inputs / outputs

Inputs:
- Upstream app repo on the VPS (main branch).
- This dashboard repo containing `content/analytics/**`.
- Stored pointer to the last processed upstream commit.

Outputs:
- Updated artifacts:
  - `content/analytics/flows.json`
  - `content/analytics/<flowSlug>/events.json`
  - `content/analytics/<flowSlug>/flow-diagrams.md`
- Optional triage artifact:
  - `content/analytics/unassigned.json` (low-confidence items requiring human review)
- A PR in this repo for review/merge.

#### Components

1) **Watcher / trigger (VPS)**
- Detects new commits on upstream `main`.
- Stores `lastProcessedCommit` locally.
- Debounces rapid successive commits.
- Guards concurrency (lock file) so only one run happens at a time.

2) **Analyzer + generator (Codex CLI + GPT-5.2)**
- Computes `git diff <lastProcessed>..<head>` in the upstream repo.
- Updates/adds/removes docs in `content/analytics/**`:
  - events and properties (exact strings)
  - Mermaid diagrams (split into multiple diagrams when huge; selector already supports this)
  - flow catalog updates
- Produces a PR-ready audit summary:
  - counts of new/changed/removed events
  - touched flows
  - any unassigned items

3) **Validator**
- Schema validation for JSON files.
- Referential integrity checks (flows.json ↔ flow dirs).
- Duplicate handling rules:
  - repeated events in a flow are allowed, but occurrence IDs must remain unique.
- Blocks PR creation on failures and emits actionable logs.

4) **PR opener**
- Creates a branch, commits artifacts, opens a PR against `main`.
- Adds labels like `analytics` + `autogenerated` (+ `needs-triage` if applicable).

#### Safety and correctness

- **Idempotency:** rerunning on the same upstream commit should produce the same output (or no-op).
- **Auditability:** PR references the upstream commit hash; optionally write generation metadata under
  `content/analytics/_meta.json`.
- **Human gate:** humans review and merge; no silent mutations.

Exit criteria:
- A new upstream commit produces a correct PR with doc updates + audit summary.
- Rare uncertain classifications are captured in `unassigned.json` for later resolution.

### Phase 3 — DB-backed storage (optional)

Goal: unlock richer relationships (cross-flow linking, canonical property catalog, tagging) while keeping
the same UX.

Scope:
- Import pipeline reads `content/analytics/**` and writes to DB tables.
- A DB adapter produces the same snapshot shape for UI.
- Keep `content/analytics/**` as the portable snapshot even if DB becomes the runtime store.

### Phase 4 — Admin workflows (triage + edits)

Scope:
- Admin views for unassigned items and manual corrections.
- Versioning/approvals for manual edits (avoid silent drift).

### Phase 5 — Expand beyond analytics

Scope:
- Treat Analytics as one module in a multi-module dashboard.
- Shared shell/navigation/search patterns and shared storage boundaries.

## Risks / constraints

- Analytics event strings can live across many places in the codebase; the updater must be robust and thorough.
- Diagram artifacts may diverge (Markdown Mermaid vs JSON summary); treat Mermaid as display-first.
- Event meaning can vary across flows; store meaning at the **occurrence** level rather than forcing a single “global description”.
- Underlying docs schemas can drift across flows; ingestion should normalize without losing exact strings.
