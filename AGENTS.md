# Repository Guidelines

## Project structure

- `src/app/`: Next.js App Router routes (e.g. `src/app/analytics/...`).
- `src/components/`: shared React components; `src/components/ui/` contains shadcn/ui primitives.
- `src/lib/`: non-UI utilities and domain logic (notably `src/lib/analytics/`).
- `content/analytics/`: analytics docs snapshot used by the filesystem adapter (flows, events, diagrams).
- `convex/`: Convex schema/functions for local dev; generated code lives in `convex/_generated/`.
- `public/`: static assets served by Next.js.
- `docs/`: design notes and HLDs.

## Build, test, and development commands

```bash
pnpm install
pnpm dev              # Next.js dev server
pnpm lint             # ESLint (Next core-web-vitals + TypeScript)
pnpm build            # production build
pnpm start            # serve production build (after `pnpm build`)
pnpm dlx convex dev   # start local Convex + write `.env.local`
```

## Coding style & naming conventions

- TypeScript + React. Keep `tsconfig.json` strictness passing and prefer `@/…` imports (`@/*` maps to `src/*`).
- Match existing conventions: kebab-case file names (`site-header.tsx`), PascalCase components, and `useX` for hooks.
- Tailwind CSS is configured via `src/app/globals.css`; keep class lists readable (wrap long props/JSX).

## Testing guidelines

- No automated test runner is configured yet. For changes, run `pnpm lint` and manually verify the affected routes
  (for Analytics: `/analytics`, `/analytics/flows`, `/analytics/events`).

## Commit & pull request guidelines

- Prefer Conventional Commit-style subjects: `feat(analytics): …`, `fix: …`, `docs: …`, `chore: …`, `security: …`.
- PRs should include: a short summary, how to test (commands + pages), and screenshots for UI changes.
- Do not commit secrets: `.env*` is gitignored; Convex writes local values into `.env.local` during dev.

## ExecPlans

When doing complex features or significant refactors, write an ExecPlan under `.ai/plans/` and follow `.ai/plans/PLANS.md`. Put temporary research artifacts under `.ai/plans/tmp/` (gitignored).
