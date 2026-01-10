# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Internal dashboard web app for Chalo, currently focused on Analytics documentation. The app displays analytics flows, events, and Mermaid diagrams sourced from a checked-in content snapshot.

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui components
- Convex (local dev deployment for future features)
- pnpm package manager

## Commands

```bash
pnpm install           # Install dependencies
pnpm dev               # Start Next.js dev server (localhost:3000)
pnpm build             # Production build
pnpm lint              # ESLint (Next core-web-vitals + TypeScript)
pnpm test              # Run unit tests (node --test)
pnpm dlx convex dev    # Start local Convex + write .env.local
```

### Analytics Updater (scripts/analytics-updater/)

```bash
node scripts/analytics-updater/run-once.js --dry-run    # Preview update without side effects
node scripts/analytics-updater/run-once.js --init       # Initialize state baseline
node scripts/analytics-updater/validate-content.js      # Validate content/analytics/**
```

## Project Structure

- `src/app/` — Next.js App Router routes (main routes under `src/app/analytics/`)
- `src/components/` — React components; `src/components/ui/` contains shadcn/ui primitives
- `src/lib/analytics/` — Analytics domain logic (server-only filesystem adapter, types, search)
- `content/analytics/` — Analytics docs snapshot (flows, events JSON, Mermaid diagrams)
- `convex/` — Convex schema/functions; `convex/_generated/` is auto-generated
- `scripts/analytics-updater/` — Automation for syncing analytics docs from upstream repo
- `ops/systemd/` — Systemd service/timer for VPS deployment
- `.ai/plans/` — ExecPlan documents for complex features
- `.ai/codex/` — Instructions for AI-assisted documentation updates

## Architecture

### Analytics Data Flow

1. **Source**: `content/analytics/<flowSlug>/events.json` + `flow-diagrams.md`
2. **Adapter**: `src/lib/analytics/fs-source.ts` reads and normalizes the content (server-only)
3. **Types**: `src/lib/analytics/types.ts` defines `AnalyticsFlow`, `AnalyticsEventOccurrence`, `AnalyticsSnapshot`
4. **Routes**: `src/app/analytics/` renders flows, events, and diagrams

Key data files:
- `content/analytics/flows.json` — Flow catalog (names, descriptions, lastAudited dates)
- `content/analytics/flow-slug-map.json` — Maps folder slugs to catalog keys
- `content/analytics/<flowSlug>/events.json` — Event definitions per flow
- `content/analytics/<flowSlug>/flow-diagrams.md` — Mermaid diagrams in markdown

### Analytics Updater Pipeline

The updater (`scripts/analytics-updater/`) syncs analytics docs from the upstream KMP app repo:

1. Polls upstream repo for new commits
2. Runs Codex/GPT to analyze diffs and update content
3. Validates generated artifacts
4. Opens a PR (never pushes directly to main)

State is stored outside git at `~/.local/state/chalo-dashboard/analytics-updater/state.json`.

## Coding Conventions

- TypeScript strict mode; use `@/*` path alias (maps to `src/*`)
- File naming: kebab-case (`site-header.tsx`), PascalCase components
- Tailwind CSS configured via `src/app/globals.css`
- Commit style: Conventional Commits (`feat(analytics):`, `fix:`, `docs:`, `chore:`, `security:`)

## Testing

- Unit tests use Node's built-in test runner (`node --test`)
- Test files: `scripts/analytics-updater/test/*.test.js`
- Manual verification for UI changes: `/analytics`, `/analytics/flows`, `/analytics/events`

## ExecPlans

For complex features or significant refactors, write an ExecPlan under `.ai/plans/` following `.ai/plans/PLANS.md`. Temporary research artifacts go in `.ai/plans/tmp/` (gitignored).

## Important Constraints

- Event name strings are case-sensitive and must remain exact (no normalization)
- Property keys must preserve exact spelling (including spaces)
- The analytics updater must never push directly to `main` — always via PR
- Convex writes local env values to `.env.local` during dev (gitignored)
