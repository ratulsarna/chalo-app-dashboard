import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function importModule(relPathFromRepoRoot) {
  const abs = path.join(process.cwd(), relPathFromRepoRoot);
  return import(pathToFileURL(abs).href);
}

test("searchDocsSnapshot returns [] for empty query", async () => {
  const { searchDocsSnapshot } = await importModule("src/lib/docs/search.ts");
  const snapshot = {
    features: [],
    overviews: [],
    featuresBySlug: {},
    overviewsBySlug: {},
  };

  assert.deepEqual(searchDocsSnapshot(snapshot, ""), []);
  assert.deepEqual(searchDocsSnapshot(snapshot, "   "), []);
});

test("searchDocsSnapshot matches name/description case-insensitively and sorts by match strength", async () => {
  const { searchDocsSnapshot } = await importModule("src/lib/docs/search.ts");

  const snapshot = {
    overviews: [
      { slug: "tech-stack", name: "Tech Stack", description: "KMP libraries", status: "draft" },
    ],
    features: [
      {
        slug: "wallet",
        name: "Chalo Wallet",
        description: "Balance and transactions",
        platforms: ["shared"],
        hasAnalyticsFlow: false,
        status: "draft",
      },
      {
        slug: "pay",
        name: "Payment",
        description: "Tech stack touches payments",
        platforms: ["shared"],
        hasAnalyticsFlow: false,
        status: "draft",
      },
    ],
    overviewsBySlug: {},
    featuresBySlug: {},
  };

  const hits = searchDocsSnapshot(snapshot, "tech");
  assert.equal(hits.length, 2);
  assert.equal(hits[0].name, "Tech Stack"); // name match should win
  assert.equal(hits[1].name, "Payment"); // description match
});
