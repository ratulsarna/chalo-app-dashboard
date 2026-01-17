import { notFound } from "next/navigation";
import {
  decodeEventNameFromPath,
  encodeEventNameForPath,
  getAnalyticsSnapshot,
} from "@/lib/analytics";
import Link from "next/link";
import { EventOccurrences } from "@/components/analytics/event-occurrences";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranchIcon } from "lucide-react";

export default async function AnalyticsEventPage({
  params,
}: {
  params: Promise<{ eventName: string }>;
}) {
  const { eventName: eventParam } = await params;
  const eventName = decodeEventNameFromPath(eventParam);

  const snapshot = await getAnalyticsSnapshot();
  const occurrences = snapshot.occurrencesByEventName[eventName];
  if (!occurrences || occurrences.length === 0) notFound();

  const diagrams = snapshot.diagramsByEventName[eventName] ?? [];

  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Event</h1>
        <p className="break-words font-mono text-sm text-muted-foreground">{eventName}</p>
      </div>

      <EventOccurrences eventName={eventName} occurrences={occurrences} />

      {diagrams.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <GitBranchIcon className="size-5" />
            Referenced in {diagrams.length} diagram{diagrams.length === 1 ? "" : "s"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {diagrams.map((d) => (
              <Link
                key={`${d.flowSlug}::${d.diagramId}`}
                href={`/analytics/flows/${encodeURIComponent(d.flowSlug)}?diagram=${encodeURIComponent(d.diagramId)}`}
              >
                <Card className="h-full transition-colors hover:bg-accent/30">
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm">{d.diagramTitle}</CardTitle>
                    <CardDescription className="text-xs">{d.flowName}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        Tip: use{" "}
        <Link
          className="underline underline-offset-4 hover:text-primary"
          href={`/analytics/events?q=${encodeEventNameForPath(eventName)}`}
        >
          global search
        </Link>{" "}
        to find similar events by partial match.
      </p>
    </main>
  );
}
