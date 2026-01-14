#!/usr/bin/env node
const fs = require("node:fs/promises");
const path = require("node:path");

const { resolveConfig } = require("./src/config.js");
const { extractPropertyValueCandidates } = require("./src/property-values.js");

function parseArgs(argv) {
  const out = {
    flow: undefined,
    eventsJson: undefined,
    property: undefined,
    include: [],
    upstream: undefined,
    dashboard: undefined,
    flowScope: false,
    scopeEvents: [],
    domains: undefined,
    noDomains: false,
    completeOnly: false,
    json: false,
    apply: false,
    overwrite: false,
    onlyMissing: false,
    maxEnumEntries: 50,
    expandLargeEnums: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg === "--flow") out.flow = argv[++i];
    else if (arg === "--events-json") out.eventsJson = argv[++i];
    else if (arg === "--property") out.property = argv[++i];
    else if (arg === "--include") out.include.push(argv[++i]);
    else if (arg === "--upstream") out.upstream = argv[++i];
    else if (arg === "--dashboard") out.dashboard = argv[++i];
    else if (arg === "--flow-scope") out.flowScope = true;
    else if (arg === "--scope-event") out.scopeEvents.push(argv[++i]);
    else if (arg === "--domains") out.domains = argv[++i];
    else if (arg === "--no-domains") out.noDomains = true;
    else if (arg === "--complete-only") out.completeOnly = true;
    else if (arg === "--json") out.json = true;
    else if (arg === "--apply") out.apply = true;
    else if (arg === "--overwrite") out.overwrite = true;
    else if (arg === "--only-missing") out.onlyMissing = true;
    else if (arg === "--max-enum-entries") out.maxEnumEntries = Number(argv[++i]);
    else if (arg === "--expand-large-enums") out.expandLargeEnums = true;
  }

  return out;
}

function usage() {
  return `
Extract candidate enum-like values for analytics property keys by scanning upstream Kotlin sources.

USAGE
  node scripts/analytics-updater/extract-property-values.js --flow <flowSlug> [options]
  node scripts/analytics-updater/extract-property-values.js --events-json <path> [options]

OPTIONS
  --flow <slug>              Flow slug under content/analytics/<slug>/events.json
  --events-json <path>       Path to an events.json file (overrides --flow)
  --property <key>           Only scan one property key from propertyDefinitions
  --include <dir>            Upstream subdir to scan (repeatable). Default: shared
  --upstream <path>          Upstream repo path (default from UPSTREAM_REPO_PATH)
  --dashboard <path>         Dashboard repo path (default from DASHBOARD_REPO_PATH)
  --flow-scope               Only scan upstream files that mention this flow’s event names (or their const names)
  --scope-event <name>       When used with --flow-scope, only use these event names for scoping (repeatable)
  --domains <path>           Property domain registry JSON (default: scripts/analytics-updater/property-domains.json)
  --no-domains               Disable domain registry
  --only-missing             Only consider properties missing a values[] array
  --apply                    Write discovered values[] back into events.json
  --complete-only            When used with --apply, only write keys marked complete (callsite-resolved OR domain-registry backed)
  --overwrite                When used with --apply, replace existing values[] instead of merging
  --max-enum-entries <n>      Max enum size to auto-expand (default: 50)
  --expand-large-enums        Allow expanding enums larger than --max-enum-entries
  --json                     Machine-readable JSON output to stdout
  -h, --help                 Show help

EXIT CODES
  0 success
  1 runtime error
  2 invalid usage
`.trim();
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function readOptionalJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function uniqSorted(values) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toTrimmedNonEmptyString(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function collectEventNamesFromEventsJson(file) {
  const names = [];

  const events = Array.isArray(file?.events) ? file.events : [];
  for (const event of events) {
    if (typeof event === "string") {
      const n = toTrimmedNonEmptyString(event);
      if (n) names.push(n);
      continue;
    }
    if (event && typeof event === "object") {
      const n = toTrimmedNonEmptyString(event.name);
      if (n) names.push(n);
    }
  }

  const stages = Array.isArray(file?.stages) ? file.stages : [];
  for (const stage of stages) {
    const stageEvents = Array.isArray(stage?.events) ? stage.events : [];
    for (const name of stageEvents) {
      const n = toTrimmedNonEmptyString(name);
      if (n) names.push(n);
    }
  }

  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}

function collectScopeEvents({ args, eventsFile }) {
  const scoped = Array.isArray(args.scopeEvents) ? args.scopeEvents.map(toTrimmedNonEmptyString).filter(Boolean) : [];
  if (scoped.length > 0) return scoped;
  return collectEventNamesFromEventsJson(eventsFile);
}

function inferFlowSlugFromEventsJsonPath(eventsJsonPath, dashboardRepoPath) {
  try {
    const analyticsRoot = path.join(dashboardRepoPath, "content", "analytics");
    const rel = path.relative(analyticsRoot, eventsJsonPath);
    const parts = rel.split(path.sep).filter(Boolean);
    if (parts.length >= 2 && parts[1] === "events.json") return parts[0];
  } catch {
    // ignore
  }
  return undefined;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const config = resolveConfig({ argv: [] });
  const upstreamRepoPath = path.resolve(args.upstream ?? config.upstreamRepoPath);
  const dashboardRepoPath = path.resolve(args.dashboard ?? config.dashboardRepoPath);

  let eventsJsonPath;
  if (args.eventsJson) {
    eventsJsonPath = path.resolve(args.eventsJson);
  } else if (args.flow) {
    eventsJsonPath = path.join(dashboardRepoPath, "content", "analytics", args.flow, "events.json");
  }

  if (!eventsJsonPath) {
    console.error("[usage] Missing --flow or --events-json");
    console.error("");
    console.error(usage());
    process.exitCode = 2;
    return;
  }

  const eventsFile = await readJson(eventsJsonPath);
  if (!isRecord(eventsFile) || !isRecord(eventsFile.propertyDefinitions)) {
    console.error(`[error] events.json has no propertyDefinitions object: ${eventsJsonPath}`);
    process.exitCode = 2;
    return;
  }

  let propertyKeys = Object.keys(eventsFile.propertyDefinitions)
    .map(toTrimmedNonEmptyString)
    .filter(Boolean);
  if (args.property) {
    propertyKeys = propertyKeys.filter((k) => k === args.property);
    if (propertyKeys.length === 0) {
      console.error(`[usage] Unknown --property key ${JSON.stringify(args.property)} for ${eventsJsonPath}`);
      process.exitCode = 2;
      return;
    }
  }

  if (args.onlyMissing) {
    propertyKeys = propertyKeys.filter((k) => {
      const def = eventsFile.propertyDefinitions?.[k];
      if (!isRecord(def)) return true;
      return !Array.isArray(def.values) || def.values.length === 0;
    });
  }

  const includeDirs = args.include.length ? args.include : ["shared"];

  const domainsPath = args.noDomains
    ? undefined
    : path.resolve(args.domains ?? path.join(dashboardRepoPath, "scripts", "analytics-updater", "property-domains.json"));
  const propertyDomains = domainsPath ? await readOptionalJson(domainsPath) : undefined;

  const flowSlug = args.flow ?? inferFlowSlugFromEventsJsonPath(eventsJsonPath, dashboardRepoPath);

  const report = await extractPropertyValueCandidates({
    upstreamRepoPath,
    includeDirs,
    propertyKeys,
    eventNames: args.flowScope ? collectScopeEvents({ args, eventsFile }) : undefined,
    flowScope: args.flowScope,
    flowSlug,
    propertyDomains,
    maxEnumEntries: Number.isFinite(args.maxEnumEntries) ? args.maxEnumEntries : 50,
    expandLargeEnums: args.expandLargeEnums,
  });

  if (args.apply) {
    let changed = false;
    for (const key of propertyKeys) {
      const discovered = report.results?.[key]?.values ?? [];
      if (!discovered.length) continue;
      if (args.completeOnly) {
        const complete = report.results?.[key]?.complete ?? false;
        if (!complete) continue;
      }
      const def = eventsFile.propertyDefinitions?.[key];
      if (!isRecord(def)) continue;
      const existing = Array.isArray(def.values) ? def.values.map(toTrimmedNonEmptyString).filter(Boolean) : [];
      const next = args.overwrite ? uniqSorted(discovered) : uniqSorted([...existing, ...discovered]);
      if (next.length === existing.length && next.every((v, idx) => v === existing[idx])) continue;
      def.values = next;
      changed = true;
    }

    if (changed) {
      const formatted = `${JSON.stringify(eventsFile, null, 2)}\n`;
      await fs.writeFile(eventsJsonPath, formatted, "utf8");
    }
  }

  if (args.json) {
    console.log(JSON.stringify({ eventsJsonPath, ...report }, null, 2));
    return;
  }

  const lines = [];
  lines.push(`events.json: ${eventsJsonPath}`);
  lines.push(`upstream:   ${upstreamRepoPath}`);
  lines.push(`include:    ${report.includeDirs.join(", ")}`);
  if (report.scopedByEvents) {
    lines.push(
      `scanned:    ${report.scannedFiles} Kotlin files (scoped) (events:${report.eventNamesCount}, consts:${report.eventConstNamesCount}, indexed:${report.indexedFiles})`,
    );
  } else {
    lines.push(`scanned:    ${report.scannedFiles} Kotlin files`);
  }
  lines.push("");

  let anyValues = false;
  for (const key of propertyKeys) {
    const values = report.results?.[key]?.values ?? [];
    if (!values.length) continue;
    anyValues = true;
    const complete = report.results?.[key]?.complete ?? false;
    const suffix = complete ? "" : " (incomplete)";
    lines.push(`${key}: ${values.join(", ")}${suffix}`);
  }
  if (!anyValues) lines.push("(no values discovered)");

  const unresolvedKeys = propertyKeys.filter((k) => (report.results?.[k]?.unresolved ?? []).length > 0);
  if (unresolvedKeys.length) {
    lines.push("");
    lines.push("Unresolved expressions (need manual tracing):");
    for (const key of unresolvedKeys) {
      const unresolved = report.results?.[key]?.unresolved ?? [];
      const sample = unresolved.slice(0, 5);
      lines.push(`- ${key}:`);
      for (const item of sample) {
        lines.push(`  - ${item.filePath}:${item.line} (${item.valueExpr})`);
      }
      if (unresolved.length > sample.length) {
        lines.push(`  - ...and ${unresolved.length - sample.length} more`);
      }
    }
  }

  if (args.apply) {
    lines.push("");
    lines.push(args.overwrite ? "[apply] Updated values[] (overwrite mode)." : "[apply] Updated values[] (merged).");
  }

  console.log(lines.join("\n"));
}

main().catch((err) => {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  console.error(message);
  process.exitCode = 1;
});
