"use client";

import * as React from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AnalyticsDocIssue } from "@/lib/analytics/types";

export type FlowCard = {
  slug: string;
  name: string;
  flowId: string;
  description?: string | null;
  lastAudited?: string | null;
  eventCount: number;
  issues?: AnalyticsDocIssue[] | null;
};

export function FlowsGrid({ flows }: { flows: FlowCard[] }) {
  const [q, setQ] = React.useState("");
  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return flows;
    return flows.filter((f) =>
      `${f.name} ${f.flowId} ${f.slug} ${f.description ?? ""}`.toLowerCase().includes(query),
    );
  }, [flows, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Flows</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a journey to see its diagrams and events.
          </p>
        </div>
        <div className="sm:w-[320px]">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search flows…"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((flow) => (
          <Link
            key={flow.slug}
            href={`/analytics/flows/${encodeURIComponent(flow.slug)}`}
            className="block h-full"
          >
            <Card className="h-full overflow-hidden transition-colors hover:bg-accent/30">
              <CardHeader className="gap-2">
                <div className="flex items-start gap-3">
                  <CardTitle className="min-w-0 flex-1 line-clamp-2 text-base leading-snug">
                    {flow.name}
                  </CardTitle>
                  <div className="flex shrink-0 items-center gap-2">
                    {flow.issues && flow.issues.length > 0 ? (
                      <Badge
                        variant={flow.issues.some((i) => i.level === "error") ? "destructive" : "outline"}
                        className="tabular-nums"
                        title={flow.issues.some((i) => i.level === "error") ? "Docs errors present" : "Docs warnings present"}
                      >
                        {flow.issues.length} issue{flow.issues.length === 1 ? "" : "s"}
                      </Badge>
                    ) : null}
                    <Badge variant="secondary" className="tabular-nums">
                      {flow.eventCount}
                    </Badge>
                  </div>
                </div>

                <CardDescription className="line-clamp-2 text-sm text-muted-foreground">
                  {flow.description ?? "No description available."}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No flows match that query.</p>
      ) : null}
    </div>
  );
}
