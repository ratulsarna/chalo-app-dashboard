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
import { FlowDiagramMarkdown } from "@/components/analytics/flow-diagram-markdown";

function byFlowSlug(snapshotFlows: AnalyticsFlow[], flowSlug: string) {
  return snapshotFlows.find((flow) => flow.slug === flowSlug);
}

function propertyAnchorId(propertyKey: string) {
  return `prop-${encodeURIComponent(propertyKey)}`;
}

function formatPropertiesUsed(properties: { property: string; context?: string }[]) {
  const keys = properties.map((p) => p.property);
  if (keys.length <= 4) return keys.join(", ");
  return `${keys.slice(0, 4).join(", ")} +${keys.length - 4} more`;
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
                      <TableRow key={key} id={propertyAnchorId(key)}>
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
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[260px]">Properties Used</TableHead>
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
                      <TableCell className="text-muted-foreground">
                        {occurrence.description ?? ""}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {occurrence.propertiesUsed && occurrence.propertiesUsed.length > 0 ? (
                          <div className="space-y-1">
                            <p>{formatPropertiesUsed(occurrence.propertiesUsed)}</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              {occurrence.propertiesUsed.slice(0, 6).map((prop) => (
                                <a
                                  key={`${occurrence.id}::${prop.property}`}
                                  className="underline underline-offset-4 hover:text-primary"
                                  href={`#${propertyAnchorId(prop.property)}`}
                                  title={prop.context ?? prop.property}
                                >
                                  {prop.property}
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : (
                          ""
                        )}
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
            <CardTitle className="text-base">Flow Diagram</CardTitle>
          </CardHeader>
          <CardContent>
            {flow.diagramMarkdown ? (
              <FlowDiagramMarkdown markdown={flow.diagramMarkdown} />
            ) : (
              <p className="text-sm text-muted-foreground">No diagram file found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
