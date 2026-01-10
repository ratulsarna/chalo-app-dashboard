# Analytics Docs Updater (Codex/GPT) — Instructions

## Goal

Given an **upstream code diff** in `~/Developer/chalo/chalo-app-kmp/` (source of truth), update this dashboard repo’s analytics docs snapshot under:

- `content/analytics/flows.json`
- `content/analytics/flow-slug-map.json` (only if new flow folders are added or renamed)
- `content/analytics/<flowSlug>/events.json`
- `content/analytics/<flowSlug>/flow-diagrams.md`
- (optional) `content/analytics/unassigned.json` for events you cannot confidently place

The output must be usable by the existing dashboard UI without code changes.

## Non‑Goals / Constraints

- Do **not** implement an AST-based extractor. Events can be anywhere; rely on code exploration instead.
- Do **not** “normalize” analytics event strings. Event names must remain **exact**.
- Prefer **minimal diffs** to existing docs: update only what changed or what is required to keep docs consistent.
- The dashboard is the consumer; do not change UI code in this run—only the content snapshot.

## What “good” looks like

After the update:

- New/changed/removed events in the upstream diff are reflected in `content/analytics/**`.
- Diagrams remain readable:
  - Large flows are split into multiple Mermaid diagrams (multiple code blocks) with meaningful headings.
  - Green nodes are clickable and represent exact event names.
- The docs still load via the dashboard’s current parser and renderer.
- Any uncertainty is captured explicitly in `content/analytics/unassigned.json` (rare).

## Repo conventions you must match

### 1) `events.json` shape

The docs currently contain **schema drift across flows**. That is OK; do not rewrite everything into one canonical schema.

The dashboard reader (`src/lib/analytics/fs-source.ts`) expects:

- Top-level `flowId`, `flowName`, `description`.
- Optional `propertyDefinitions` object (recommended when known).
- Either (or both) of:
  - `stages` as a list of stage objects with `name`, `description`, and `events` (array of event-name strings).
  - `events` as an array of event objects with:
    - `name` (required)
    - `stage` or `funnelPosition` (optional)
    - `component` or `firingLocation` (optional; used for “component” display)
    - `source` (optional)
    - `description` (optional but recommended)
    - `properties` (optional; can be `[{ property: "x" }]`, `[{ name: "x", description, required }]`, or `["x"]`)

If you add new events, prefer using the existing style already used in that flow’s `events.json`.

### 2) `flow-diagrams.md` requirements

The dashboard extracts all ```mermaid blocks and uses the nearest preceding markdown heading as the diagram label.

Rules:

- Include **multiple** Mermaid diagrams when a single diagram would be unreadable.
- Include at least one diagram whose heading contains **“Main”** or **“Funnel”** when possible (the UI prefers that as the default).
- Ensure analytics event nodes are green using this convention:
  - Use `classDef event fill:#166534,stroke:#166534,color:#ffffff;`
  - Apply `class <nodeIds> event;` to all event nodes
- **Event node labels must match the exact event strings** found in that flow’s `events.json`.
  - This is required so clicking a green node can open the side panel for that event.

### 3) Flow catalog + slug mapping

- `content/analytics/flows.json` is the high-level catalog of flows (human name, description, lastAudited).
- `content/analytics/flow-slug-map.json` maps folder slugs (`content/analytics/<flowSlug>/`) to catalog keys.

If you add a new folder under `content/analytics/`, ensure `flow-slug-map.json` and `flows.json` are updated accordingly.

When you update a flow’s content, update its `lastAudited` date in `flows.json` to the date of this run (YYYY-MM-DD).

## How to do the update (workflow)

1) Inspect the upstream diff between the last processed commit and the new upstream `HEAD`.
2) Identify analytics events impacted by the change:
   - Added events
   - Removed events
   - Renamed events (treat as remove + add unless upstream guarantees aliasing)
   - Property key changes
   - Stage/funnel context changes
3) Use targeted code search in the upstream repo to confirm the exact event strings and their properties/stage context.
4) Update the relevant flow docs under `content/analytics/`:
   - If a flow already exists, edit its `events.json` and `flow-diagrams.md`.
   - If an entirely new flow is introduced, add a new folder and wire up slug mapping and the catalog.
5) Keep diagrams readable:
   - Split overly wide/horizontal funnels into sub-diagrams by stage/module/branch.
   - Prefer “overview” + “subflows” rather than one mega-chart.
6) If you cannot confidently classify an event into any flow:
   - Add it to `content/analytics/unassigned.json` with:
     - event name
     - suspected flow(s)
     - callsite(s)
     - reasoning for uncertainty
7) Produce a run summary for the PR body (stdout is fine):
   - Upstream commit range processed
   - Flows changed (added/updated/removed)
   - Count of events added/removed/changed (best-effort)
   - Any unassigned items

## Examples to copy (use these as templates)

Use these existing docs as style references:

- Multi-diagram `flow-diagrams.md` with headings + visual key:
  - `content/analytics/search/flow-diagrams.md`
- `events.json` with string-based stage grouping + per-event properties:
  - `content/analytics/payment/events.json`
- `events.json` with richer per-event property metadata (name/required/description):
  - `content/analytics/instant-ticket-purchase/events.json`

## Safety rules

- Do not edit anything outside `content/analytics/**` unless explicitly required by these instructions.
- Do not delete flows unless the upstream diff clearly removes the feature or its instrumentation.
- Preserve event name strings exactly (case, punctuation, spacing).

