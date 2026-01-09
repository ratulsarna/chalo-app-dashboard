import Link from "next/link";
import Form from "next/form";
import { getAnalyticsSnapshot, searchAnalyticsOccurrences, occurrenceAnchorId } from "@/lib/analytics";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AnalyticsEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const snapshot = await getAnalyticsSnapshot();
  const hits = query.length > 0 ? searchAnalyticsOccurrences(snapshot, query).slice(0, 200) : [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
      <p className="mt-2 text-muted-foreground">
        Global partial search across event <span className="font-medium">name</span>,{" "}
        <span className="font-medium">stage</span>, and{" "}
        <span className="font-medium">component</span>.
      </p>

      <Form className="mt-6 flex gap-2" action="/analytics/events">
        <Input name="q" placeholder="Search..." defaultValue={query} />
        <Button type="submit">Search</Button>
      </Form>

      {query.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Enter a query to search across all flows.
        </p>
      ) : (
        <div className="mt-6 rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead className="w-[200px]">Stage</TableHead>
                <TableHead className="w-[260px]">Component</TableHead>
                <TableHead className="w-[220px]">Flow</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hits.map(({ occurrence }) => (
                <TableRow key={occurrence.id}>
                  <TableCell className="font-medium">{occurrence.eventName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {occurrence.stage ?? ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {occurrence.component ?? ""}
                  </TableCell>
                  <TableCell>
                    <Link
                      className="underline underline-offset-4 hover:text-primary"
                      href={`/analytics/flows/${encodeURIComponent(
                        occurrence.flowSlug,
                      )}#${occurrenceAnchorId(occurrence)}`}
                    >
                      {occurrence.flowName}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
