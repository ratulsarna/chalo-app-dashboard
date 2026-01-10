# ExecPlan: Interactive Flow Diagram Viewer (Option 1 — Keep Mermaid as Input)

## Why this matters (user perspective)

Right now, many flow diagrams are **wide and dense**, so the “diagram first” experience is not legible or usable. This plan upgrades diagrams into an **interactive viewer** (fit/zoom/pan + diagram selector + click-to-open-event) while keeping the existing **Mermaid markdown** as the source of truth.

The outcome should let a PM or engineer:
- Open a flow and **actually read** the diagram (even if huge).
- **Select** among multiple diagrams in a flow doc (e.g., “Main funnel”, “Trip planner”, “Errors”).
- Click a **green (event) node** to jump directly to the event’s details sheet.

## Scope

### In scope

1) **Diagram selector**
   - Extract all Mermaid code blocks from `flow-diagrams.md`.
   - Display a selector (dropdown / segmented control) labeled by the nearest preceding heading.
   - Default to a “best” diagram (heuristic) but always allow switching.

2) **Interactive viewer for Mermaid-rendered SVG**
   - Fit-to-screen on load.
   - Zoom controls (+ / −) + mouse wheel zoom.
   - Click-and-drag pan.
   - Reset / Fit buttons.
   - Works in both the inline “Overview” preview and the expanded full-screen sheet.

3) **Clickable event nodes (green convention)**
   - Only treat nodes styled as the Mermaid `event` class (green) as clickable.
   - Clicking a green node:
     - Finds the matching event occurrence in the current flow.
     - Navigates to the flow’s **Events** tab and opens the existing details sheet.

4) **Huge diagrams**
   - Use the best default behavior: fit + zoom + pan.
   - Add an optional “Layout” toggle when useful (e.g., `flowchart LR` ↔ `flowchart TD`) and iterate based on results.

### Out of scope (explicit non-goals)

- Replacing Mermaid with a native graph model / React Flow / Cytoscape (that’s “Option 2 / phase later”).
- Automatically generating or editing diagrams.
- Making non-event nodes clickable.
- Adding a full automated e2e suite (repo currently has no test runner configured).

## Definitions (plain language)

- **Mermaid code block**: a fenced markdown section starting with ```mermaid and ending with ```.
- **Green node convention**: diagrams apply `classDef event ...` and `class <nodeIds> event;` to analytics event nodes.
- **Occurrence**: a specific appearance of an event in a flow (already modeled in `snapshot.occurrences`).
- **Open event sheet**: the right-side “Details” overlay already used in the Events list.

## Decision Log

- 2026-01-10: Use **Option 1** (Mermaid remains the authoring format; we improve viewing/interactivity).
- 2026-01-10: Add a **diagram selector** (user confirmed).
- 2026-01-10: Only nodes using the **green/event class convention** are clickable (user confirmed).
- 2026-01-10: For huge diagrams, start with “best effort” (fit/zoom/pan + optional layout toggle) and iterate (user confirmed).

## Research (repo patterns + constraints)

### Files inspected (existing patterns to extend)

- `content/analytics/*/flow-diagrams.md`
  - Diagrams frequently include **multiple Mermaid blocks**.
  - The first block is often a **visual key**, not the main flow.
  - “Green node convention” is implemented via Mermaid class definitions:
    - `classDef event fill:#166534,stroke:#166534,color:#ffffff;`
    - `class ev_* event;`
- `src/components/analytics/mermaid-block.tsx`
  - Renders Mermaid to an SVG string and injects it via `dangerouslySetInnerHTML`.
  - No interactivity; no accessors for nodes.
- `src/components/analytics/flow-diagram-markdown.tsx`
  - `FlowDiagramPreview` chooses a “best” Mermaid block via heuristics.
  - Expand uses a `Sheet` and shows Mermaid source.
- `src/app/analytics/flows/[flowSlug]/page.tsx`
  - “Overview” uses `FlowDiagramPreview` (diagram first).
- `src/components/analytics/flow-events.tsx`
  - Event details are shown in a `Sheet`.
  - Supports opening the sheet via a query param: `?open=<occurrenceId>` (already implemented).

### Baseline verification (before changes)

1) Run: `pnpm dev --port 3000`
2) Open a large diagram (example): `/analytics/flows/payment`
3) Observe:
   - Diagram is too small to read; expand still requires manual scrolling; no zoom/pan controls.
   - Only one diagram is shown in Overview, despite multiple Mermaid blocks existing in the markdown.

## Open Questions (User Clarification)

1) When a green node label **does not exactly match** any event in `events.json` (rare, but possible), what should happen?
   a) Show an inline “No exact match” notice and do nothing (safe)
   b) Open global event search with that label prefilled (recommended)
   c) Treat it as a fuzzy match and open the closest event (risky)

2) Default diagram selection when multiple blocks exist:
   a) Prefer headings containing “Main”/“Funnel” first; otherwise pick the largest non-visual-key block (recommended)
   b) Always default to the largest non-visual-key block
   c) Always default to the first non-visual-key block

Reply format: `1b 2a` or `defaults`.

## Test Specification

This is primarily UI behavior and this repo has no unit test runner configured. Instead:

1) Add pure helper functions (no DOM) and validate them via manual dev verification:
   - `extractMermaidBlocks(markdown)` returns an ordered list with labels.
   - `pickDefaultBlock(blocks)` chooses the expected default.
2) Manual validation is the acceptance gate (see below).

If we decide to introduce a test runner later, these helpers should be the first things to unit test.

## Plan of Work

### 1) Introduce a reusable “Mermaid blocks” parser

- Add a helper module (recommended path):
  - `src/lib/analytics/diagram-markdown.ts`
- Implement:
  - `type MermaidBlockMeta = { id: string; title: string; code: string; kind: "visual-key" | "diagram" }`
  - `extractMermaidBlocks(markdown: string): MermaidBlockMeta[]`
    - Identify all ```mermaid blocks and their code.
    - Compute `title` from the nearest preceding markdown heading (`##`, `###`, `####`), falling back to `Diagram N`.
    - Classify `kind`:
      - `visual-key` if title contains “visual key” or code contains only the legend pattern (small and generic).
      - Otherwise `diagram`.
  - `pickDefaultMermaidBlock(blocks: MermaidBlockMeta[]): MermaidBlockMeta | null`
    - Apply the selection heuristic (see Open Question #2).

### 2) Build an interactive SVG viewer wrapper for Mermaid output

- Add a component:
  - `src/components/analytics/mermaid-diagram-viewer.tsx`
- Responsibilities:
  - Render Mermaid code (reuse `mermaid.render` via existing patterns).
  - Provide UI controls:
    - Fit, Reset, Zoom in, Zoom out
  - Implement pan/zoom:
    - Store `{ scale, x, y }` in React state.
    - Apply transform to the injected SVG element:
      - Prefer transforming the top-level `<svg>` via CSS `transform`.
      - If needed, transform the root `<g>` (query inside the SVG) for better results.
    - On first render, run `fitToContainer()`:
      - Measure SVG bounds and container bounds.
      - Choose a scale that fits with padding; center the diagram.
    - Support:
      - Mouse wheel zoom (zoom around cursor).
      - Pointer drag pan.
  - Detect “event nodes” (green convention):
    - After render, query Mermaid’s node elements (typically `g.node`).
    - Consider a node clickable if:
      - It has class `event`, OR
      - Its computed fill matches the event color `#166534` (fallback).
    - Extract visible label text from the node (join `<text>` content; normalize whitespace).

### 3) Wire diagram clicks to open the event details sheet

- In flow pages, clicking a green node should:
  1) Find the first matching occurrence in this flow by exact name match.
  2) Navigate to: `/analytics/flows/<flowSlug>?tab=events&open=<occurrence.id>`

Implementation notes:
- The `FlowEvents` component already reads `?open=...` and opens its sheet.
- The flow page already supports `?tab=events` as default tab.

### 4) Add a diagram selector to the flow Overview

- Update `src/components/analytics/flow-diagram-markdown.tsx` (or replace its preview usage) to:
  - Extract blocks via `extractMermaidBlocks`.
  - Show a selector:
    - Dropdown on desktop, maybe a compact `Select` component.
    - For each option show `title` and maybe the Mermaid direction (`LR`/`TD`) as a subtle hint.
  - Keep “Expand” but expand the **currently selected** diagram.
  - Persist selection via query param:
    - `?diagram=<blockId>` (stable; derived from title + index).

### 5) Optional: layout direction toggle (iterate)

- Only for `flowchart` diagrams:
  - Detect `flowchart LR|RL|TB|TD` at the start of the Mermaid code.
  - Provide a toggle that rewrites direction to `TD` when width >> height, and back to `LR` on demand.
- Make it a non-destructive view option (does not edit markdown).

## Concrete Steps (commands)

Run from repo root: `/home/ratul/Developer/chalo/chalo-app-dashboard`

1) Start dev server:
   - `pnpm dev --port 3000`
2) Navigate and validate:
   - `/analytics/flows/payment`
   - `/analytics/flows/search`
   - Use the diagram selector to switch between sub-diagrams.
3) Lint:
   - `pnpm lint`

## Validation and Acceptance

### Functional acceptance (manual)

For a large flow like Payment:

1) **Diagram selector**
   - On `/analytics/flows/payment` (Overview tab), a selector is visible.
   - It lists multiple diagrams (not just the visual key).
   - Selecting a different diagram updates the preview and the expanded view.

2) **Fit / zoom / pan**
   - On load, diagram is “fit to container” (not microscopic).
   - Wheel zoom works.
   - Drag pan works.
   - Buttons Fit/Reset/+/− work.

3) **Clickable green nodes**
   - Clicking a green node (event class) navigates to Events tab and opens the event sheet.
   - Clicking a non-green node does nothing.

4) **Huge diagram handling**
   - For a very wide diagram, the user can still reach any node via pan/zoom.
   - If layout toggle exists, it improves readability for at least one wide diagram.

### Quality acceptance

- No horizontal page overflow introduced.
- Mobile: diagram preview remains usable (fit/zoom) and selector is accessible.
- `pnpm lint` passes.

## Idempotence and Recovery

- All changes are additive/refactors; safe to retry.
- If Mermaid rendering breaks, user can still access:
  - `Docs` tab raw markdown (`FlowDiagramMarkdown`) and “Show source”.

## Interfaces and Dependencies

### New modules / components (proposed)

- `src/lib/analytics/diagram-markdown.ts`
  - `extractMermaidBlocks(markdown: string): MermaidBlockMeta[]`
  - `pickDefaultMermaidBlock(blocks: MermaidBlockMeta[]): MermaidBlockMeta | null`
- `src/components/analytics/mermaid-diagram-viewer.tsx`
  - Props:
    - `code: string`
    - `flowSlug?: string`
    - `onEventClick?: (eventName: string) => void`
  - Exposes viewer UI + pan/zoom behavior.

### Existing code to extend

- `src/components/analytics/mermaid-block.tsx`
  - Likely refactor to expose the SVG element/container so `mermaid-diagram-viewer` can attach behaviors.
- `src/components/analytics/flow-diagram-markdown.tsx`
  - Replace the current “best guess” preview with selector + viewer.
- `src/app/analytics/flows/[flowSlug]/page.tsx`
  - Ensure Overview uses the new selector/viewer and passes flowSlug for click handling.

## Plan Revision Notes

- 2026-01-10: Initial plan created based on current Mermaid conventions in `content/analytics/*/flow-diagrams.md` and the existing `FlowEvents` query-param open behavior.

