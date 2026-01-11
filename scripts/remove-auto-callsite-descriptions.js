#!/usr/bin/env node
/**
 * Removes event descriptions that are just callsite placeholders:
 *   "Auto-documented from code callsite: ..."
 *
 * Usage:
 *   node scripts/remove-auto-callsite-descriptions.js            # write changes
 *   node scripts/remove-auto-callsite-descriptions.js --dry-run  # report only
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs/promises");
const path = require("node:path");

const CONTENT_ROOT = path.join(process.cwd(), "content", "analytics");
const PREFIX = "Auto-documented from code callsite:";
const PROPERTY_PLACEHOLDER = "Auto-documented from code; validate semantics and expected values.";

async function listFilesRecursively(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listFilesRecursively(p)));
    } else if (entry.isFile()) {
      out.push(p);
    }
  }
  return out;
}

function cleanDescriptionsDeep(value) {
  if (!value) return 0;
  if (Array.isArray(value)) {
    let removed = 0;
    for (const item of value) removed += cleanDescriptionsDeep(item);
    return removed;
  }
  if (typeof value !== "object") return 0;

  let removed = 0;
  for (const key of Object.keys(value)) {
    const v = value[key];
    if (key === "description" && typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed.startsWith(PREFIX) || trimmed === PROPERTY_PLACEHOLDER) {
        delete value[key];
        removed += 1;
        continue;
      }
    }
    removed += cleanDescriptionsDeep(v);
  }
  return removed;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  let contentRootStat;
  try {
    contentRootStat = await fs.stat(CONTENT_ROOT);
  } catch {
    console.error(`Missing content root: ${CONTENT_ROOT}`);
    process.exitCode = 2;
    return;
  }
  if (!contentRootStat.isDirectory()) {
    console.error(`Content root is not a directory: ${CONTENT_ROOT}`);
    process.exitCode = 2;
    return;
  }

  const files = (await listFilesRecursively(CONTENT_ROOT))
    .filter((p) => p.endsWith(`${path.sep}events.json`))
    .sort();

  let totalRemoved = 0;
  let changedFiles = 0;

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);

    const removed = cleanDescriptionsDeep(parsed);

    if (removed === 0) continue;
    totalRemoved += removed;
    changedFiles += 1;

    if (!dryRun) {
      const out = `${JSON.stringify(parsed, null, 2)}\n`;
      await fs.writeFile(filePath, out, "utf8");
    }
  }

  const mode = dryRun ? "dry-run" : "write";
  console.log(`[${mode}] Removed ${totalRemoved} auto-callsite descriptions across ${changedFiles} file(s).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exitCode = 1;
});
