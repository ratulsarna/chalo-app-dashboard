import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function importModule(relPathFromRepoRoot) {
  const abs = path.join(process.cwd(), relPathFromRepoRoot);
  return import(pathToFileURL(abs).href);
}

test("extractMarkdownToc extracts h2-h4 headings and ignores fenced code blocks", async () => {
  const { extractMarkdownToc } = await importModule("src/lib/docs/toc.ts");

  const md = [
    "# Title",
    "",
    "## Overview",
    "",
    "```mermaid",
    "## Not a heading",
    "```",
    "",
    "### Details",
    "",
    "### Details",
    "",
    "#### Deep dive",
    "",
  ].join("\n");

  const toc = extractMarkdownToc(md);
  assert.deepEqual(
    toc.map((i) => ({ id: i.id, text: i.text, level: i.level })),
    [
      { id: "overview", text: "Overview", level: 2 },
      { id: "details", text: "Details", level: 3 },
      { id: "details-2", text: "Details", level: 3 },
      { id: "deep-dive", text: "Deep dive", level: 4 },
    ],
  );
});
