import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function importModule(relPathFromRepoRoot) {
  const abs = path.join(process.cwd(), relPathFromRepoRoot);
  return import(pathToFileURL(abs).href);
}

test("assertSafeDocsSlug rejects traversal and unsafe characters", async () => {
  const { assertSafeDocsSlug } = await importModule("src/lib/docs/paths.ts");

  assert.throws(() => assertSafeDocsSlug("../etc/passwd", "x"));
  assert.throws(() => assertSafeDocsSlug("a/b", "x"));
  assert.throws(() => assertSafeDocsSlug("a..b", "x"));
  assert.throws(() => assertSafeDocsSlug(".hidden", "x"));
  assert.doesNotThrow(() => assertSafeDocsSlug("help", "x"));
  assert.doesNotThrow(() => assertSafeDocsSlug("components-ios", "x"));
});

test("toMarkdownFilename appends .md and validates", async () => {
  const { toMarkdownFilename } = await importModule("src/lib/docs/paths.ts");
  assert.equal(toMarkdownFilename("hld"), "hld.md");
  assert.throws(() => toMarkdownFilename("../hld"));
});
