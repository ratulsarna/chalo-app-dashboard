# Chalo Dashboard

Internal dashboard web app (starting with Analytics docs).

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Convex (local dev deployment; can be linked to a cloud deployment later)

## Local development

1) Start Convex (local):

```bash
pnpm dlx convex dev
```

2) Start Next.js:

```bash
pnpm dev
```

The Convex CLI writes `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` into `.env.local`.
