import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function importModule(relPathFromRepoRoot) {
  const abs = path.join(process.cwd(), relPathFromRepoRoot);
  return import(pathToFileURL(abs).href);
}

test("parseMarkdownFrontmatter strips frontmatter and parses scalars/arrays", async () => {
  const { parseMarkdownFrontmatter } = await importModule("src/lib/docs/frontmatter.ts");

  const input = [
    "---",
    "feature: help",
    "lastUpdated: 2026-01-15",
    "sourceCommit: null",
    "platforms: [android, ios, shared]",
    "hasAnalyticsFlow: true",
    "---",
    "",
    "# Title",
    "",
    "Body",
    "",
  ].join("\n");

  const out = parseMarkdownFrontmatter(input);
  assert.equal(out.content.trim(), "# Title\n\nBody");
  assert.deepEqual(out.frontmatter, {
    feature: "help",
    lastUpdated: "2026-01-15",
    sourceCommit: null,
    platforms: ["android", "ios", "shared"],
    hasAnalyticsFlow: true,
  });
});

test("parseMarkdownFrontmatter returns original content when no frontmatter", async () => {
  const { parseMarkdownFrontmatter } = await importModule("src/lib/docs/frontmatter.ts");
  const input = "# Hello\n\nWorld\n";
  const out = parseMarkdownFrontmatter(input);
  assert.equal(out.content, input);
  assert.equal(out.frontmatter, undefined);
});
