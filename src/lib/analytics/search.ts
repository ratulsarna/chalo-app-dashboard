import "server-only";

import type { AnalyticsEventOccurrence, AnalyticsSnapshot } from "@/lib/analytics/types";

export type AnalyticsSearchHit = {
  occurrence: AnalyticsEventOccurrence;
  matchedOn: Array<"name" | "stage" | "component">;
};

function includesInsensitive(haystack: string | undefined, needleLower: string) {
  if (!haystack) return false;
  return haystack.toLowerCase().includes(needleLower);
}

export function searchAnalyticsOccurrences(
  snapshot: AnalyticsSnapshot,
  query: string,
): AnalyticsSearchHit[] {
  const q = query.trim();
  if (q.length === 0) return [];

  const needleLower = q.toLowerCase();
  const hits: AnalyticsSearchHit[] = [];

  for (const occurrence of snapshot.occurrences) {
    const matchedOn: AnalyticsSearchHit["matchedOn"] = [];
    if (includesInsensitive(occurrence.eventName, needleLower)) matchedOn.push("name");
    if (includesInsensitive(occurrence.stage, needleLower)) matchedOn.push("stage");
    if (includesInsensitive(occurrence.component, needleLower)) matchedOn.push("component");

    if (matchedOn.length > 0) hits.push({ occurrence, matchedOn });
  }

  hits.sort((a, b) => {
    const scoreA = a.matchedOn.length;
    const scoreB = b.matchedOn.length;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return a.occurrence.eventName.localeCompare(b.occurrence.eventName);
  });

  return hits;
}

