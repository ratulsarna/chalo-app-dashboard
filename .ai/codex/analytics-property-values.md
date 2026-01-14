# Analytics Property Values (Finite Domains) — Workflow

## Goal

Populate `content/analytics/<flowSlug>/events.json` → `propertyDefinitions.<key>.values[]` with **complete, finite** value sets (strings), while avoiding dynamic/unbounded values (e.g. server error messages).

This repo does **not** treat “saw some values in code” as sufficient — we only write `values[]` when we can justify a *closed set*.

## Tools

- Extractor CLI (scans upstream Kotlin): `node scripts/analytics-updater/extract-property-values.js`
- Domain registry (manual mapping → auto-extracted values): `scripts/analytics-updater/property-domains.json`
- Content validation: `node scripts/analytics-updater/validate-content.js`

Upstream repo path is normally `~/Developer/chalo/chalo-app-kmp` (via `scripts/analytics-updater/src/config.js`).

## The Workflow (New Flow)

1) **Run an initial scan (don’t write yet).**

```bash
node scripts/analytics-updater/extract-property-values.js --flow <flowSlug> --only-missing --flow-scope
```

This gives you:
- discovered values per property key (from statically resolvable callsites)
- unresolved assignments (e.g. `... to ticketStatus`) that likely need a domain registry or are dynamic

If `--flow-scope` pulls in unrelated callsites because **event names are shared across flows**, narrow the scoping needles to a few events that are unique to the flow:

```bash
node scripts/analytics-updater/extract-property-values.js --flow <flowSlug> --only-missing --flow-scope \
  --scope-event "<eventName>" \
  --scope-event "<anotherEventName>"
```

2) **Classify each unresolved key.**

For each key in “Unresolved expressions”:
- **Dynamic/unbounded** → do nothing (no `values[]`)
- **Finite domain** (comes from a known enum/const set) → add to the domain registry

3) **Add/extend the domain registry for finite keys.**

Edit `scripts/analytics-updater/property-domains.json` and add a mapping for the property key.

4) **Re-run and write only complete keys.**

```bash
node scripts/analytics-updater/extract-property-values.js --flow <flowSlug> --only-missing --flow-scope --complete-only --apply
```

Notes:
- `--complete-only` writes only keys marked `complete` by the extractor.
- Add `--overwrite` if you want the registry to replace an existing (possibly stale) `values[]` list.

5) **Validate content.**

```bash
node scripts/analytics-updater/validate-content.js
```

6) **Update progress tracker.**

- Mark the flow in `.ai/codex/analytics-property-values-progress.md`.

## What the Domain Registry Does (and Why)

Callsite scanning often can’t prove completeness because instrumentation frequently passes values through variables/params:

- `ATTRIBUTE_TICKET_STATUS to ticketStatus`
- `ATTRIBUTE_TICKET_STATUS to model.status.name`

In these cases we can still generate a complete set by declaring the **domain**:

> “`ticketStatus` values are exactly `PremiumReserveTicketStatus.name`” (or whatever enum/consts define the finite set).

The extractor then:
- reads the upstream enum/consts
- derives the full value set
- cross-checks against any statically observed values
- only treats the result as `complete` when it’s safe

## Domain Registry Format (Reference)

Top-level shape: `{ "<propertyKey>": DomainEntry | DomainEntry[] }`

Use an array when the same property key means different things in different flows.

```json
{
  "ticketStatus": [
    {
      "flows": ["metro"],
      "description": "Metro ticket status.",
      "sources": [
        { "kind": "enumName", "name": "MetroTicketStatus" },
        { "kind": "enumName", "name": "OndcMetroTicketStatus" }
      ]
    }
  ]
}
```

### Supported source kinds

- `enumName`: all enum entry names
  - `{ "kind": "enumName", "name": "PremiumReserveTicketStatus" }`
  - Optional disambiguation when multiple enums share a name:
    - `{ "kind": "enumName", "name": "OndcTicketStatus", "filePath": "shared/.../OndcTicketAppModel.kt" }`

- `enumProperty`: enum constructor property (string) per entry
  - `{ "kind": "enumProperty", "enum": "CheckoutProductType", "property": "type" }`

- `const`: one constant string value
  - `{ "kind": "const", "name": "AnalyticsEventConstants.PRODUCT_TYPE_MTICKET" }`

- `constPrefix`: all `const val` whose qualified name starts with a prefix
  - `{ "kind": "constPrefix", "prefix": "AnalyticsEventConstants.PRODUCT_TYPE_" }`

- `literal`: explicit values (use sparingly)
  - `{ "kind": "literal", "values": ["foo", "bar"] }`

All sources support an optional `"transform": "lowercase" | "uppercase"` (rarely needed).

## Debugging / Safety Checks

- To see whether values are coming from domains vs callsites, use JSON output:

```bash
node scripts/analytics-updater/extract-property-values.js --flow <flowSlug> --property <key> --flow-scope --json
```

- If the registry mapping is wrong, the extractor should refuse to treat it as complete when:
  - the domain source can’t be found / is empty
  - `enumProperty` is missing a string value for some entries
  - statically observed values are **not** contained in the declared domain

- Use `--no-domains` to compare “callsite-only” behavior:

```bash
node scripts/analytics-updater/extract-property-values.js --flow <flowSlug> --only-missing --flow-scope --no-domains
```
