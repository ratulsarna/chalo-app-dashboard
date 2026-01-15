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

function byFlowSlug(snapshotFlows: AnalyticsFlow[], flowSlug: string) {
  return snapshotFlows.find((flow) => flow.slug === flowSlug);
}

function propertyAnchorId(propertyKey: string) {
  return `prop-${encodeURIComponent(propertyKey)}`;
}

function safeId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function AnalyticsFlowDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ flowSlug: string }>;
  searchParams?: Promise<{ tab?: string | string[]; diagram?: string | string[]; diagramTitle?: string | string[] }>;
}) {
  const { flowSlug } = await params;
  const { tab: rawTab, diagram: rawDiagram, diagramTitle: rawDiagramTitle } = (await searchParams) ?? {};
  const tabParam = Array.isArray(rawTab) ? rawTab[0] : rawTab;
  const diagramParam = Array.isArray(rawDiagram) ? rawDiagram[0] : rawDiagram;
  const diagramTitleParam = Array.isArray(rawDiagramTitle) ? rawDiagramTitle[0] : rawDiagramTitle;
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
  const tabBaseId = `flow-tabs-${safeId(flow.slug) || "default"}`;
  const tabTriggerId = (value: string) => `${tabBaseId}-trigger-${value}`;
  const tabContentId = (value: string) => `${tabBaseId}-content-${value}`;

  const flowIssues = (flow.issues ?? []).slice().sort((a, b) => {
    if (a.level !== b.level) return a.level === "error" ? -1 : 1;
    return a.code.localeCompare(b.code);
  });

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

      {flowIssues.length > 0 ? (
        <Card className={flowIssues.some((i) => i.level === "error") ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardHeader>
            <CardTitle className="text-base">Docs issues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Some documentation for this flow failed validation. The dashboard will still load, but some events or definitions may be missing.
            </p>
            <ul className="space-y-1 text-sm">
              {flowIssues.slice(0, 8).map((issue, idx) => (
                <li key={`${issue.code}::${idx}`} className="flex items-start gap-2">
                  <Badge variant={issue.level === "error" ? "destructive" : "outline"} className="mt-0.5">
                    {issue.level}
                  </Badge>
                  <span className="min-w-0 break-words">
                    {issue.message}
                    {issue.filePath ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({issue.filePath.split("/").slice(-2).join("/")})
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            {flowIssues.length > 8 ? (
              <p className="text-xs text-muted-foreground">
                +{flowIssues.length - 8} more issue{flowIssues.length - 8 === 1 ? "" : "s"} not shown.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Tabs key={defaultTab} defaultValue={defaultTab} className="space-y-4">
        <TabsList className="w-fit justify-start">
          <TabsTrigger
            value="overview"
            id={tabTriggerId("overview")}
            aria-controls={tabContentId("overview")}
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="events"
            id={tabTriggerId("events")}
            aria-controls={tabContentId("events")}
          >
            Events
          </TabsTrigger>
          <TabsTrigger
            value="properties"
            id={tabTriggerId("properties")}
            aria-controls={tabContentId("properties")}
          >
            Properties
          </TabsTrigger>
          <TabsTrigger
            value="docs"
            id={tabTriggerId("docs")}
            aria-controls={tabContentId("docs")}
          >
            Docs
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          id={tabContentId("overview")}
          aria-labelledby={tabTriggerId("overview")}
          className="space-y-6"
        >
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-base">Flow diagram</CardTitle>
            </CardHeader>
            <CardContent>
              {flow.diagramMarkdown ? (
                <FlowDiagramPanel
                  flowSlug={flow.slug}
                  diagramMarkdown={flow.diagramMarkdown}
                  occurrences={flowOccurrences}
                  propertyDefinitions={flow.propertyDefinitions}
                  initialDiagramParam={diagramParam ?? null}
                  initialDiagramTitleParam={diagramTitleParam ?? null}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No diagram file found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="events"
          id={tabContentId("events")}
          aria-labelledby={tabTriggerId("events")}
          className="space-y-6"
        >
          <FlowEvents
            flowSlug={flow.slug}
            occurrences={flowOccurrences}
            propertyDefinitions={flow.propertyDefinitions}
          />
        </TabsContent>

        <TabsContent
          value="properties"
          id={tabContentId("properties")}
          aria-labelledby={tabTriggerId("properties")}
          className="space-y-6"
        >
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

        <TabsContent
          value="docs"
          id={tabContentId("docs")}
          aria-labelledby={tabTriggerId("docs")}
          className="space-y-6"
        >
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
