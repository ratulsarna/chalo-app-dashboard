# ExecPlan: Intra-Flow Diagram Navigation (Clickable Sub-Flows)

## Purpose / Big Picture

Today, a “main” Mermaid diagram often contains high-level nodes like “UPI Flow” or “Card Flow”, but clicking those nodes does nothing. After this change, clicking a “sub-flow” node in a diagram will navigate to the corresponding Mermaid diagram **within the same flow’s** `content/analytics/<flowSlug>/flow-diagrams.md` (no cross-flow navigation yet).

The primary user-visible outcome: on `/analytics/flows/payment` (Overview tab), clicking the “UPI Flow” node in the “Main payment flow…” diagram switches the viewer to the “Funnel: UPI payment method flow” diagram (and updates the URL so the view is shareable).

## Progress

- [x] (2026-01-11 11:24Z) Draft ExecPlan created.
- [x] (2026-01-11 11:31Z) Confirm UX + authoring convention (resolved via `defaults`).
- [ ] Implement diagram-link parsing + node click handling.
- [ ] Add initial content annotations (Payment flow) for validation.
- [ ] Manual validation across a few flows.

## Surprises & Discoveries

- None yet (plan-only).

## Decision Log

- Decision: Implement navigation in the **Overview** interactive diagram viewer (`FlowDiagramPanel` / `MermaidDiagramViewer`) by switching the `?diagram=` selection, rather than scrolling within the “Docs” tab markdown.
  Rationale: The Overview viewer is the primary “diagram first” experience and already supports multiple diagrams via `?diagram=...`.
  Date/Author: 2026-01-11 / Ratul + Codex (`defaults`).

- Decision: Keep Mermaid `securityLevel: "strict"` and implement navigation by attaching click handlers to rendered SVG nodes (no `<a href>` links emitted by Mermaid).
  Rationale: Avoids loosening SVG sanitization while still enabling controlled in-app navigation.
  Date/Author: 2026-01-11 / Ratul + Codex (`defaults`).

- Decision: Require explicit author annotations in Mermaid source (a comment directive) to mark which nodes navigate to which diagrams.
  Rationale: Heuristics based on labels (“UPI Flow”) are brittle and will break silently; explicit mapping is predictable and reviewable in git.
  Date/Author: 2026-01-11 / Ratul + Codex (`defaults`).

- Decision: Link targets reference **diagram headings** (`title:<diagramHeading>`), resolved within the same flow.
  Rationale: Diagram headings are more stable than numeric/index-based ids across insertions/reordering.
  Date/Author: 2026-01-11 / Ratul + Codex (`defaults`).

- Decision: Title matching is “case-insensitive exact match” after trimming and collapsing whitespace.
  Rationale: Reduces accidental breakage from minor heading casing/spacing edits while still avoiding fuzzy heuristics.
  Date/Author: 2026-01-11 / Ratul + Codex (`defaults`).

## Outcomes & Retrospective

- Not started.

## Context and Orientation

### What exists today

- Flow documentation lives at `content/analytics/<flowSlug>/flow-diagrams.md` (example: `content/analytics/payment/flow-diagrams.md`).
- The flow details route is `src/app/analytics/flows/[flowSlug]/page.tsx`.
  - Overview tab renders `src/components/analytics/flow-diagram-panel.tsx` (interactive diagram picker + `?diagram=` param).
  - Docs tab renders `src/components/analytics/flow-diagram-markdown.tsx` (renders the markdown with Mermaid blocks but minimal interactivity).
- Mermaid blocks are parsed from markdown by `src/lib/analytics/diagram-markdown.ts` (`extractMermaidBlocks`, `pickDefaultMermaidBlock`).
- Interactive SVG viewing (pan/zoom + click-to-open-event) is implemented in `src/components/analytics/mermaid-diagram-viewer.tsx`.
  - It already post-processes the rendered SVG to:
    - find nodes (`g.node`)
    - detect “event nodes” (green)
    - attach `data-analytics-event` labels and a click handler to open event details.
- Mermaid rendering is centralized in `src/components/analytics/mermaid.ts` and currently initializes Mermaid with `securityLevel: "strict"`.

### Terms (plain language)

- **Flow page**: `/analytics/flows/<flowSlug>`.
- **Mermaid block**: a fenced markdown code block starting with ```mermaid.
- **Diagram selection**: the `?diagram=<blockId>` query param used by `FlowDiagramPanel` to select one Mermaid block from `flow-diagrams.md`.
- **Intra-flow diagram navigation**: clicking a node in one diagram changes the selected diagram to another Mermaid block in the same flow’s markdown file.

## Research

### Repo patterns to reuse (files inspected)

- `content/analytics/payment/flow-diagrams.md`
  - The “Main payment flow…” diagram includes nodes `ui_upiFlow([UPI Flow])`, `ui_cardFlow([Card Flow])`, etc.
  - The file also contains separate Mermaid blocks titled “Funnel: UPI payment method flow”, “Funnel: Card payment method flow”, etc.
- `src/components/analytics/flow-diagram-panel.tsx`
  - Owns selection of Mermaid blocks (via `extractMermaidBlocks`) and persists selection in `?diagram=...`.
- `src/lib/analytics/diagram-markdown.ts`
  - Provides `MermaidBlockMeta { id, title, code, kind, direction }`.
  - `id` is derived from the heading title plus a running index (used in `?diagram=`).
- `src/components/analytics/mermaid-diagram-viewer.tsx`
  - Already enhances the rendered SVG and has a click pathway we can extend to handle “diagram link nodes”.
- `src/components/analytics/mermaid.ts`
  - Mermaid is initialized with `securityLevel: "strict"`, so we should not rely on Mermaid emitting clickable anchors for navigation.

### Baseline verification (before implementation)

1) Run: `pnpm dev`
2) Open: `/analytics/flows/payment` (Overview tab)
3) Select: “Main payment flow: Entry → …”
4) Observe: clicking `UPI Flow` / `Card Flow` nodes does nothing (no diagram navigation).

### Implementation feasibility unknowns (to confirm during implementation research)

- How Mermaid encodes the original node identifier (e.g. `ui_upiFlow`) into the rendered SVG:
  - Confirm whether it appears in the node’s `<title>`, `id=""` attribute, or another attribute.
  - We will implement a best-effort `getMermaidNodeId()` that tries multiple strategies, but we should confirm on real rendered output in the browser devtools.

## Open Questions (User Clarification)

None (resolved via `defaults` on 2026-01-11).

## Test Specification

This feature is primarily UI behavior and this repo does not currently have a unit-test setup for TS/React components. Instead, define manual acceptance tests that are concrete and repeatable.

Manual test cases (must all pass after implementation):

1) Payment flow intra-navigation
   - Open `/analytics/flows/payment` (Overview tab).
   - Select the “Main payment flow…” diagram.
   - Click the `UPI Flow` node.
   - Expect:
     - the selected diagram changes to “Funnel: UPI payment method flow”
     - the URL updates to include `?diagram=<upiDiagramId>` (or equivalent, per final decision)
     - pan/zoom still works; no accidental navigation on drag
   - Repeat for `Card Flow` → “Funnel: Card payment method flow”.

2) No regression: event node click still opens event details
   - In any diagram, click a green event node (e.g. “Payment Modes Screen opened”).
   - Expect: the event details sheet opens (current behavior).

3) Unknown link target is safe
   - Add a deliberate bad link directive in a test flow (or temporarily in Payment) pointing to a non-existent diagram.
   - Expect: no crash; optionally a toast/console warning; no navigation.

4) Back/forward behavior
   - After navigating diagram A → B by clicking a node, browser back returns to A (if we use URL-driven state).

## Plan of Work

### 1) Add “diagram link directive” parsing (pure string parsing)

Create a small helper in `src/lib/analytics/` (recommended new file: `src/lib/analytics/diagram-links.ts`) that:

- Parses Mermaid source code lines for a dedicated comment directive.
- Produces a list of `{ nodeId, target }`.

Recommended directive format (single line):

- `%%chalo:diagram-link <nodeId> -> title:<diagramTitle>`
- (Reserved for later if needed) `%%chalo:diagram-link <nodeId> -> id:<diagramId>`

Parsing rules:

- Only lines starting with `%%chalo:diagram-link` are considered.
- `<nodeId>` is the Mermaid node identifier (e.g. `ui_upiFlow`).
- Whitespace is flexible.
- `title:` targets are resolved by case-insensitive exact match after trimming + collapsing whitespace.
- Invalid directives are ignored (but should be easy to debug via dev-only warnings).

### 2) Resolve “target” → selected diagram id (flow-local)

In `src/components/analytics/flow-diagram-panel.tsx`, where we already have `blocks: MermaidBlockMeta[]`:

- Build a resolver:
  - If target is `id:<diagramId>`: verify it exists in `blocks`, else ignore.
  - If target is `title:<diagramTitle>`: find the matching block(s) by `block.title`.
    - If exactly one match: use that block’s `id`.
    - If 0 matches: ignore + warn.
    - If >1 matches: ignore + warn (and recommend authors disambiguate).

This produces a mapping: `nodeId -> diagramBlockId`.

### 3) Make `MermaidDiagramViewer` support clickable “diagram link nodes”

Extend `src/components/analytics/mermaid-diagram-viewer.tsx`:

- New optional props:
  - `diagramLinks?: Record<string, string>` (nodeId → diagramBlockId)
  - `onDiagramLinkClick?: (diagramBlockId: string) => void`
- During the “inject and enhance SVG” effect:
  - Determine a best-effort Mermaid node id for each `g.node` (implementation to be finalized after inspecting real SVG output):
    - Try: `node.querySelector("title")?.textContent`
    - Else: parse `node.getAttribute("id")`
    - Normalize (trim) and use as the lookup key into `diagramLinks`.
  - For matched nodes:
    - add a CSS class (e.g. `analytics-diagram-link-node`)
    - set `data-analytics-diagram-target="<diagramBlockId>"`
    - add hover styles distinct from event nodes (e.g., slightly thicker stroke + pointer cursor)
- In the existing click handler:
  - If a clicked node has `data-analytics-diagram-target` and `onDiagramLinkClick` is provided, call it.
  - Preserve the existing “drag suppresses click” behavior.
  - Preserve event-node click behavior (if both apply, define precedence explicitly; recommended: diagram-link nodes are intended for non-event nodes only).

### 4) Wire `FlowDiagramPanel` to navigate via `?diagram=...`

In `src/components/analytics/flow-diagram-panel.tsx`:

- For the currently selected Mermaid block, compute `diagramLinks` (from its code + flow-local blocks).
- Pass `diagramLinks` and `onDiagramLinkClick={(id) => setDiagram(id)}` into both:
  - the inline `MermaidDiagramViewer`
  - the expanded-sheet `MermaidDiagramViewer`

This keeps all navigation “within the same flow” by construction.

### 5) Add initial annotations to prove it works (Payment)

Update `content/analytics/payment/flow-diagrams.md` “Main payment flow…” Mermaid block with directives such as:

- `%%chalo:diagram-link ui_upiFlow -> title:Funnel: UPI payment method flow`
- `%%chalo:diagram-link ui_cardFlow -> title:Funnel: Card payment method flow`
- `%%chalo:diagram-link ui_netbankingFlow -> title:Funnel: Net Banking & Wallet flows`
- `%%chalo:diagram-link ui_walletFlow -> title:Funnel: Net Banking & Wallet flows`
- `%%chalo:diagram-link ui_chaloPayFlow -> title:Funnel: Chalo Pay wallet flow`

Note: this plan intentionally avoids cross-flow targets; later we can extend the directive to `flow:<flowSlug>` when needed.

## Concrete Steps

Run from repo root: `/home/ratul/Developer/chalo/chalo-app-dashboard`

1) Implement parsing + viewer changes
   - `pnpm lint` (after code changes)

2) Start dev server
   - `pnpm dev`

3) Manual validation
   - Visit `/analytics/flows/payment`
   - Execute the manual tests in `Test Specification`.

## Validation and Acceptance

Acceptance is met when:

- On `/analytics/flows/payment` (Overview), clicking a linked “sub-flow” node in the main diagram switches the selected diagram to the intended target within the same flow.
- The `?diagram=` query param reflects the new selected diagram so back/forward works.
- Clicking green event nodes continues to open the event details sheet (no regression).
- Invalid/missing link directives do not crash the page and are ignored safely.
