# Analytics Web App — Current State (What’s Implemented)

This doc describes the **current behavior and features** of the Analytics section as implemented on branch `feat/analytics-mvp` (commit `40eba95`).

## Goal (MVP)

- Start from **flows** (journeys), understand the instrumentation path, and drill into events.
- Provide **global search** across event name/stage/component (partial matches).
- Make it easy to answer: “**Where is this event fired?**” and “**What properties does it send?**”

## Information Architecture / Layout

- **Analytics shell** wraps all `/analytics/*` routes:
  - Left sidebar: flow list + “Filter flows…” input.
  - Top sticky subheader: global search + quick links (Flows / Events).
  - Mobile: the flow list is in a left `Sheet` (hamburger icon).
- **Dark mode is default** (no theme toggle yet).

## Routes & Screens

### `/analytics` (landing)

- Short positioning copy aimed at PM usage (journey validation + debugging).
- Quick-start cards (Browse flows, Search events, Explore a flow).
- Sidebar is already available here, so you can jump straight into a flow.

### `/analytics/flows` (browse flows)

- Flow cards with:
  - Flow name
  - slug
  - event count badge
  - catalog metadata where available (description + “audited YYYY-MM-DD” pill)
- Search input filters the grid by name/slug.

### `/analytics/flows/[flowSlug]` (flow detail)

Tabs:
- **Overview (default)**:
  - **Diagram first**: renders a “best” Mermaid diagram preview from `flow-diagrams.md`.
    - Has an **Expand** button that opens a right-side sheet with a bigger diagram + Mermaid source.
  - Stages summary card: stage counts (“Unstaged” included).
- **Events**:
  - Events grouped by stage in an accordion.
  - Default-open stages: top 2 by count (excluding “Unstaged” unless it’s one of the top).
  - Per-flow search filters by name, stage, component, description, source, and properties.
  - Clicking an event opens a details sheet (see “Details UX” below).
- **Properties**:
  - Property definitions table (key/type/description + a few example values as pills).
  - Property anchors exist (`#prop-...`) so event sheets can deep-link to a property definition.
- **Docs**:
  - Full rendered markdown view of `flow-diagrams.md` with Mermaid support.
  - “Show source” toggle for the raw markdown.

Notes:
- `?tab=events|properties|docs` is supported and sets the default selected tab.

### `/analytics/events` (global event search)

- Search field with server-side query param `q`.
- Partial match search across:
  - event name
  - stage
  - component
- Results are grouped by **event name** into cards showing:
  - match count (number of occurrences matched)
  - “Matches on: …” summary
  - sample flows (up to 3) as pills
- Clicking a result goes to the canonical event page.

### `/analytics/events/[eventName]` (canonical event page)

- Shows all occurrences of an event **grouped by flow** (cards).
- Each occurrence is a compact row with stage + source + description.
- Clicking a row opens a details sheet (component + properties used + notes).
- “Open in flow” links to the flow page with an anchor for that specific occurrence.

## Global Search (⌘K / Ctrl+K)

- Cmd/Ctrl+K opens a command palette search dialog.
- Uses `/api/analytics/search?q=...` and returns:
  - flow matches (name/slug/id)
  - event matches (grouped by event name, with match counts)
- Selecting:
  - a flow navigates to `/analytics/flows/[flowSlug]`
  - an event navigates to `/analytics/events/[eventName]`

## Data Source (Filesystem Adapter)

All analytics content is read from `content/analytics/`.

- Flow folders: `content/analytics/<flowSlug>/`
  - `events.json` (authoritative for event list + property definitions)
  - `flow-diagrams.md` (authoritative for diagrams / narrative docs)
- Catalog metadata: `content/analytics/flows.json`
- Slug-key mapping: `content/analytics/flow-slug-map.json`
  - This exists because folder slugs and `flows.json` keys don’t always match.
  - Used to enrich each flow with `catalog` fields (description, lastAudited, etc.).

## Details UX (the “PM ergonomics” bits)

- “Long strings” (components, sources, raw docs) are not shown in big tables by default.
- Instead:
  - Lists stay scannable.
  - Details are in a `Sheet` (side panel) with copy/link actions.
- Event sheets generally provide:
  - event name (copy)
  - stage/source badges (when present)
  - description
  - component (hidden until sheet)
  - properties used with deep links to the flow’s property definitions

## Guardrails / Safety / Correctness

- Occurrence IDs include the **event index** to avoid collisions when the same event repeats within a flow.
- `flowSlug` is validated to reduce path traversal risk in filesystem reads.
- Client components avoid importing server-only modules by importing from:
  - `@/lib/analytics/types`
  - `@/lib/analytics/urls`
  rather than `@/lib/analytics` (which re-exports the filesystem source).

## How To Run / Smoke Test

- Run dev server: `pnpm dev --port 3010`
- Key pages:
  - `/analytics`
  - `/analytics/flows`
  - `/analytics/flows/search`
  - `/analytics/events?q=search`
  - `/analytics/events/search%20screen%20opened`

