import { notFound } from "next/navigation";
import {
  getAnalyticsSnapshot,
  occurrenceAnchorId,
  type AnalyticsFlow,
} from "@/lib/analytics";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function byFlowSlug(snapshotFlows: AnalyticsFlow[], flowSlug: string) {
  return snapshotFlows.find((flow) => flow.slug === flowSlug);
}

export default async function AnalyticsFlowDetailPage({
  params,
}: {
  params: Promise<{ flowSlug: string }>;
}) {
  const { flowSlug } = await params;
  const snapshot = await getAnalyticsSnapshot();
  const flow = byFlowSlug(snapshot.flows, flowSlug);
  if (!flow) notFound();

  const flowOccurrences = snapshot.occurrences.filter((o) => o.flowSlug === flow.slug);
  const propertyRows = Object.entries(flow.propertyDefinitions).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{flow.flowName}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>slug: {flow.slug}</span>
          <Badge variant="outline">{flow.flowId}</Badge>
          <span className="tabular-nums">{flow.events.length} events</span>
        </div>
        {flow.description ? (
          <p className="mt-3 text-muted-foreground">{flow.description}</p>
        ) : null}
      </div>

      <div className="mt-8 grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Property Definitions</CardTitle>
          </CardHeader>
          <CardContent>
            {propertyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No property definitions.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead className="w-[120px]">Type</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {propertyRows.map(([key, def]) => (
                      <TableRow key={key}>
                        <TableCell className="font-medium">{key}</TableCell>
                        <TableCell className="text-muted-foreground">{def.type}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {def.description ?? ""}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead className="w-[200px]">Stage</TableHead>
                    <TableHead className="w-[260px]">Component</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flowOccurrences.map((occurrence) => (
                    <TableRow key={occurrence.id} id={occurrenceAnchorId(occurrence)}>
                      <TableCell className="font-medium">{occurrence.eventName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {occurrence.stage ?? ""}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {occurrence.component ?? ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Flow Diagram (source)</CardTitle>
          </CardHeader>
          <CardContent>
            {flow.diagramMarkdown ? (
              <details>
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Show <code>flow-diagrams.md</code>
                </summary>
                <pre className="mt-4 max-h-[520px] overflow-auto rounded-md bg-muted p-4 text-xs leading-5">
                  {flow.diagramMarkdown}
                </pre>
              </details>
            ) : (
              <p className="text-sm text-muted-foreground">No diagram file found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
