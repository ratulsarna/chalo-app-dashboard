import Link from "next/link";
import { notFound } from "next/navigation";
import {
  decodeEventNameFromPath,
  encodeEventNameForPath,
  getAnalyticsSnapshot,
  occurrenceAnchorId,
} from "@/lib/analytics";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Event</h1>
        <p className="break-words font-mono text-sm text-muted-foreground">{eventName}</p>
        <p className="text-sm text-muted-foreground">
          {occurrences.length} occurrence{occurrences.length === 1 ? "" : "s"} across flows.
        </p>
      </div>

      <div className="mt-6 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">Flow</TableHead>
              <TableHead className="w-[200px]">Stage</TableHead>
              <TableHead className="w-[260px]">Component</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {occurrences.map((occurrence) => (
              <TableRow key={occurrence.id}>
                <TableCell className="font-medium">
                  <Link
                    className="underline underline-offset-4 hover:text-primary"
                    href={`/analytics/flows/${encodeURIComponent(
                      occurrence.flowSlug,
                    )}#${occurrenceAnchorId(occurrence)}`}
                  >
                    {occurrence.flowName}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{occurrence.stage ?? ""}</TableCell>
                <TableCell className="text-muted-foreground">
                  {occurrence.component ?? ""}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {occurrence.description ?? ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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

