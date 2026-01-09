import { notFound } from "next/navigation";
import {
  decodeEventNameFromPath,
  encodeEventNameForPath,
  getAnalyticsSnapshot,
} from "@/lib/analytics";
import Link from "next/link";
import { EventOccurrences } from "@/components/analytics/event-occurrences";

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

  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Event</h1>
        <p className="break-words font-mono text-sm text-muted-foreground">{eventName}</p>
      </div>

      <EventOccurrences eventName={eventName} occurrences={occurrences} />

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
