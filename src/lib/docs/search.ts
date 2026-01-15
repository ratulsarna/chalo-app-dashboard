import type { DocsSearchHit, DocsSnapshot } from "@/lib/docs/types";

function normalizeQuery(query: string) {
  return query.trim().toLowerCase();
}

export function searchDocsSnapshot(snapshot: DocsSnapshot, query: string): DocsSearchHit[] {
  const q = normalizeQuery(query);
  if (q.length === 0) return [];

  const hits: DocsSearchHit[] = [];

  for (const ov of snapshot.overviews) {
    const matchedIn: DocsSearchHit["matchedIn"] = [];
    if (ov.name.toLowerCase().includes(q)) matchedIn.push("name");
    if (ov.description.toLowerCase().includes(q)) matchedIn.push("description");
    if (matchedIn.length) {
      hits.push({
        type: "overview",
        slug: ov.slug,
        name: ov.name,
        description: ov.description,
        matchedIn,
      });
    }
  }

  for (const feat of snapshot.features) {
    const matchedIn: DocsSearchHit["matchedIn"] = [];
    if (feat.name.toLowerCase().includes(q)) matchedIn.push("name");
    if (feat.description.toLowerCase().includes(q)) matchedIn.push("description");
    if (matchedIn.length) {
      hits.push({
        type: "feature",
        slug: feat.slug,
        name: feat.name,
        description: feat.description,
        matchedIn,
      });
    }
  }

  function score(hit: DocsSearchHit) {
    // Prefer name matches, then description matches.
    const fields = new Set(hit.matchedIn);
    return (fields.has("name") ? 2 : 0) + (fields.has("description") ? 1 : 0);
  }

  return hits.sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}

