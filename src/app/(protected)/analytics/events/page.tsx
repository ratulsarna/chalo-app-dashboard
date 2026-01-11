import Link from "next/link";
import Form from "next/form";
import {
  encodeEventNameForPath,
  getAnalyticsSnapshot,
  searchAnalyticsOccurrences,
} from "@/lib/analytics";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AnalyticsEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const queryParam = Array.isArray(q) ? q[0] : q;
  const query = (queryParam ?? "").trim();
  const snapshot = await getAnalyticsSnapshot();
  const allHits = query.length > 0 ? searchAnalyticsOccurrences(snapshot, query) : [];

  const grouped = (() => {
    const byEventName = new Map<
      string,
      {
        eventName: string;
        matchCount: number;
        matchedOn: Set<string>;
        sampleFlows: Map<string, string>;
      }
    >();

    for (const hit of allHits) {
      const key = hit.occurrence.eventName;
      const entry =
        byEventName.get(key) ??
        {
          eventName: key,
          matchCount: 0,
          matchedOn: new Set<string>(),
          sampleFlows: new Map<string, string>(),
        };

      entry.matchCount += 1;
      hit.matchedOn.forEach((m) => entry.matchedOn.add(m));
      if (entry.sampleFlows.size < 3) {
        entry.sampleFlows.set(hit.occurrence.flowSlug, hit.occurrence.flowName);
      }
      byEventName.set(key, entry);
    }

    return Array.from(byEventName.values())
      .sort((a, b) => b.matchCount - a.matchCount || a.eventName.localeCompare(b.eventName))
      .slice(0, 60);
  })();

  const truncated = grouped.length >= 60;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
      <p className="mt-2 text-muted-foreground">
        Global partial search across event <span className="font-medium">name</span>,{" "}
        <span className="font-medium">component</span>.
      </p>
      </div>

      <Form className="mt-6 flex gap-2" action="/analytics/events">
        <Input name="q" placeholder="Search..." defaultValue={query} />
        <Button type="submit">Search</Button>
      </Form>

      {query.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How to use</CardTitle>
            <CardDescription>
              Start typing an event name (or part of a component). For faster navigation,
              press <span className="font-medium">⌘K</span> to open global search.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {grouped.length} event{grouped.length === 1 ? "" : "s"} matched
            {truncated ? " (showing top 60; refine to narrow)." : "."}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {grouped.map((ev) => (
              <Link
                key={ev.eventName}
                href={`/analytics/events/${encodeEventNameForPath(ev.eventName)}`}
              >
                <Card className="h-full transition-colors hover:bg-accent/30">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{ev.eventName}</CardTitle>
                        <CardDescription className="mt-1">
                          Matches on: {Array.from(ev.matchedOn.values()).join(", ")}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="shrink-0 tabular-nums">
                        {ev.matchCount}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Array.from(ev.sampleFlows.entries()).map(([slug, name]) => (
                        <Badge key={`${ev.eventName}::${slug}`} variant="outline">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
