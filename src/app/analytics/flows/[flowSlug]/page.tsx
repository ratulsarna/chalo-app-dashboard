import { notFound } from "next/navigation";
import {
  getAnalyticsSnapshot,
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
import { FlowDiagramPanel } from "@/components/analytics/flow-diagram-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlowEvents } from "@/components/analytics/flow-events";
import { Separator } from "@/components/ui/separator";

function byFlowSlug(snapshotFlows: AnalyticsFlow[], flowSlug: string) {
  return snapshotFlows.find((flow) => flow.slug === flowSlug);
}

function propertyAnchorId(propertyKey: string) {
  return `prop-${encodeURIComponent(propertyKey)}`;
}

function stageLabel(stage: string | undefined) {
  return stage?.trim().length ? stage : "Unstaged";
}

export default async function AnalyticsFlowDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ flowSlug: string }>;
  searchParams?: Promise<{ tab?: string | string[] }>;
}) {
  const { flowSlug } = await params;
  const { tab: rawTab } = (await searchParams) ?? {};
  const tabParam = Array.isArray(rawTab) ? rawTab[0] : rawTab;
  const tab = (tabParam ?? "").toLowerCase();
  const defaultTab =
    tab === "events" || tab === "properties" || tab === "docs" ? tab : "overview";

  const snapshot = await getAnalyticsSnapshot();
  const flow = byFlowSlug(snapshot.flows, flowSlug);
  if (!flow) notFound();

  const flowOccurrences = snapshot.occurrences.filter((o) => o.flowSlug === flow.slug);
  const propertyRows = Object.entries(flow.propertyDefinitions).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const stageCounts = (() => {
    const counts = new Map<string, number>();
    for (const occurrence of flowOccurrences) {
      const key = stageLabel(occurrence.stage);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));
  })();

  return (
    <main className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{flow.flowName}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{flow.flowId}</Badge>
          <span className="tabular-nums">{flow.events.length} events</span>
          {flow.catalog?.lastAudited ? (
            <span className="tabular-nums">last audited: {flow.catalog.lastAudited}</span>
          ) : null}
        </div>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          {flow.catalog?.description ?? flow.description ?? "No description available."}
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="w-fit justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="docs">Docs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="min-w-0 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-base">Flow diagram</CardTitle>
              </CardHeader>
              <CardContent>
                {flow.diagramMarkdown ? (
                  <FlowDiagramPanel
                    flowSlug={flow.slug}
                    diagramMarkdown={flow.diagramMarkdown}
                    occurrences={flowOccurrences}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No diagram file found.</p>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Stages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Quick overview of where events fire in this journey.
                </p>
                <Separator />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {stageCounts.map(([stage, count]) => (
                    <div key={stage} className="rounded-md border bg-muted/30 p-3">
                      <p className="truncate text-sm font-medium">{stage}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{count} events</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Use the <span className="font-medium">Events</span> tab to search and inspect details.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <FlowEvents flowSlug={flow.slug} occurrences={flowOccurrences} />
        </TabsContent>

        <TabsContent value="properties" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Property definitions</CardTitle>
            </CardHeader>
            <CardContent>
              {propertyRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No property definitions.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
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
                            {def.values && def.values.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {def.values.slice(0, 8).map((v) => (
                                  <Badge key={`${key}::${v}`} variant="secondary">
                                    {v}
                                  </Badge>
                                ))}
                                {def.values.length > 8 ? (
                                  <Badge variant="outline">+{def.values.length - 8} more</Badge>
                                ) : null}
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Flow docs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This tab shows the flow documentation as authored in <code>flow-diagrams.md</code>.
              </p>
              <div className="mt-4">
                {flow.diagramMarkdown ? (
                  <FlowDiagramMarkdown markdown={flow.diagramMarkdown} defaultShowSource />
                ) : (
                  <p className="text-sm text-muted-foreground">No diagram file found.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
