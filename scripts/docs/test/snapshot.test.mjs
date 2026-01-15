import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function importModule(relPathFromRepoRoot) {
  const abs = path.join(process.cwd(), relPathFromRepoRoot);
  return import(pathToFileURL(abs).href);
}

test("normalizeDocsCatalog reverses feature-slug-map (folderSlug -> featureKey) into featureKey -> folderSlug", async () => {
  const { normalizeDocsCatalog, buildDocsSnapshotFromCatalog } = await importModule("src/lib/docs/snapshot.ts");

  const catalog = {
    _version: "1.0",
    features: {
      "instant-ticket": {
        name: "Instant Ticket",
        description: "desc",
        platforms: ["android", "ios", "shared"],
        hasAnalyticsFlow: true,
        analyticsFlowSlug: "instant-ticket",
        status: "draft",
        lastUpdated: "2026-01-15",
        sourceCommit: null,
      },
    },
    overview: {
      "tech-stack": { name: "Tech Stack", description: "ts", status: "draft" },
    },
  };

  const slugMap = {
    "instant-ticket-purchase": "instant-ticket",
  };

  const normalized = normalizeDocsCatalog(catalog, slugMap);
  assert.equal(normalized.featureFolderByKey["instant-ticket"], "instant-ticket-purchase");

  const snapshot = buildDocsSnapshotFromCatalog(normalized);
  assert.equal(snapshot.featuresBySlug["instant-ticket"].slug, "instant-ticket");
  assert.equal(snapshot.overviewsBySlug["tech-stack"].slug, "tech-stack");
});

test("buildDocsSnapshotFromCatalog sorts deterministically by name", async () => {
  const { buildDocsSnapshotFromCatalog } = await importModule("src/lib/docs/snapshot.ts");

  const snapshot = buildDocsSnapshotFromCatalog({
    features: {
      b: { slug: "b", name: "B", description: "", platforms: ["shared"], hasAnalyticsFlow: false, status: "pending" },
      a: { slug: "a", name: "A", description: "", platforms: ["shared"], hasAnalyticsFlow: false, status: "pending" },
    },
    overviews: {
      z: { slug: "z", name: "Z", description: "", status: "pending" },
      y: { slug: "y", name: "Y", description: "", status: "pending" },
    },
    featureFolderByKey: { a: "a", b: "b" },
  });

  assert.deepEqual(snapshot.features.map((f) => f.slug), ["a", "b"]);
  assert.deepEqual(snapshot.overviews.map((o) => o.slug), ["y", "z"]);
});
