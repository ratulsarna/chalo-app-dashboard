# Chalo Dashboard — Analytics (MVP) HLD

## Purpose

Build an internal, interactive web app that helps **PMs and engineers** explore Chalo’s analytics instrumentation:

- Browse flows (journeys) and understand the event taxonomy per flow.
- Search across all events/properties by **partial** match (not exact-only).

This dashboard will later expand beyond analytics, so the foundation should support additional modules.

## Goals (MVP)

### Primary user workflows

1) **Flows-first landing**
- Choose a flow → view:
  - Flow metadata (name/description/last audited)
  - Event list (name, stage, component, description, properties used)
  - Property definitions for that flow

2) **Global search**
- Search (partial match) across:
  - event `name`
  - event `stage`
  - event `component`
- Results allow drilling into:
  - the **flow occurrence** (event-in-flow context)
  - the **canonical event** page (one event string aggregated across flows)

### Non-goals (MVP)

- Authentication/authorization (assumed behind Tailscale).
- Admin triage inbox (unassigned/low-confidence) and edit workflows.
- Git watcher + LLM updater pipeline (planned for Phase 2).

## Source of truth (Phase 1)

Analytics documentation will be **copied/moved into this repo** (not kept in the app code repo).

Expected structure (to be created):

```
docs/analytics/
  flows.json
  <flowId>/
    events.json
    flow-diagrams.md
```

### Notes on diagrams

- `flow-diagrams.md` (Mermaid) is treated as the **primary** diagram artifact for display.
- `events.json.diagram` exists in some flows but appears to be a **summary** and may not match the Markdown diagrams; the app should not assume they are identical.

## Data model (conceptual)

Key constraint: the same event string can appear in multiple flows (e.g., Validation).

### Canonical event vs occurrence

- **Canonical Event** = the exact emitted string (case-sensitive, exact match).
- **Event Occurrence** = usage of an event within a specific flow/stage/component.

The UI should primarily render occurrences (flow context) while enabling an Event page that aggregates occurrences.

### Property keys

Property keys must remain **exact** (including spaces/casing) to avoid drifting from emitted analytics properties and breaking lookups.

## Architecture

### Web app

- **Next.js (App Router) + TypeScript**
- **Tailwind + shadcn/ui**
- **Convex** is present for future DB-backed features, but MVP can start read-only from files.

### Data access strategy

Use a “source adapter” abstraction so UI does not depend on where data comes from:

- **Phase 1 adapter (files):** reads `docs/analytics/**`, parses JSON/Markdown.
- **Phase 2 adapter (Convex):** reads normalized tables / imported snapshot.

UI consumes a stable, in-memory **Analytics Snapshot** produced by the adapter.

## UI (MVP)

### Routes

- `/analytics` (landing)
- `/analytics/flows` (flows index)
- `/analytics/flows/[flowId]` (flow detail)
- `/analytics/events` (global search + event index)
- `/analytics/events/[eventName]` (canonical event detail: all occurrences)

### Search behavior

- Partial match (substring) over:
  - event name
  - stage
  - component
- Default sort: best match first, then flowId/stage for stable grouping.

## Operational plan (Phase 2, later)

### Git watcher + LLM updater

When the upstream app repo receives a new commit on `main`:

1) A watcher triggers a Codex CLI + GPT-5.2 run on the VPS.
2) The agent reviews the diff and updates/adds/removes:
   - `docs/analytics/<flowId>/events.json`
   - `docs/analytics/<flowId>/flow-diagrams.md`
   - `docs/analytics/flows.json` (if flow catalog changes)
3) The agent opens a **PR** against this dashboard repo for review.

### Triage bucket

If the agent can’t confidently classify an event into a flow/stage, it writes it to a separate artifact (e.g. `docs/analytics/unassigned.json`) for later admin triage (not required for MVP UI).

## Risks / constraints

- Analytics event strings can live across many places in the codebase; the updater must be robust and thorough.
- Diagram artifacts may diverge (Markdown Mermaid vs JSON summary); UI should treat Mermaid as display-first.
- Event meaning can vary across flows; store meaning at the **occurrence** level rather than forcing a single “global description”.

