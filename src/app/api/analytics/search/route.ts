import "server-only";

import { NextResponse } from "next/server";
import { getAnalyticsSnapshot, searchAnalyticsOccurrences } from "@/lib/analytics";

function getFirstParam(value: string | string[] | null) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = getFirstParam(url.searchParams.getAll("q"));
  const query = (q ?? "").trim();

  if (query.length === 0) {
    return NextResponse.json({ flows: [], events: [] });
  }

  const snapshot = await getAnalyticsSnapshot();

  const flows = snapshot.flows
    .filter((flow) => {
      const haystack = `${flow.flowName} ${flow.flowId} ${flow.slug}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    })
    .slice(0, 10)
    .map((flow) => ({
      slug: flow.slug,
      name: flow.flowName,
      eventCount: flow.events.length,
      lastAudited: flow.catalog?.lastAudited ?? null,
    }));

  // Occurrence search can return many rows; group by event name.
  const hits = searchAnalyticsOccurrences(snapshot, query).slice(0, 200);
  const byName = new Map<
    string,
    {
      eventName: string;
      count: number;
      sample: Array<{ flowSlug: string; flowName: string }>;
    }
  >();

  for (const hit of hits) {
    const key = hit.occurrence.eventName;
    const entry = byName.get(key) ?? { eventName: key, count: 0, sample: [] };
    entry.count += 1;
    if (entry.sample.length < 3) {
      entry.sample.push({ flowSlug: hit.occurrence.flowSlug, flowName: hit.occurrence.flowName });
    }
    byName.set(key, entry);
  }

  const events = Array.from(byName.values())
    .sort((a, b) => b.count - a.count || a.eventName.localeCompare(b.eventName))
    .slice(0, 20);

  return NextResponse.json({ flows, events });
}

