"use client";

import * as React from "react";
import Link from "next/link";
import { CopyIcon, ExternalLinkIcon, InfoIcon } from "lucide-react";

import type { AnalyticsEventOccurrence } from "@/lib/analytics/types";
import { occurrenceAnchorId } from "@/lib/analytics/urls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function stageLabel(stage: string | undefined) {
  return stage?.trim().length ? stage : "Unstaged";
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Ignore clipboard errors (e.g., insecure context).
  }
}

export function EventOccurrences({
  eventName,
  occurrences,
}: {
  eventName: string;
  occurrences: AnalyticsEventOccurrence[];
}) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const selected = React.useMemo(
    () => (openId ? occurrences.find((o) => o.id === openId) ?? null : null),
    [occurrences, openId],
  );

  const byFlow = React.useMemo(() => {
    const map = new Map<
      string,
      { flowSlug: string; flowName: string; items: AnalyticsEventOccurrence[] }
    >();

    for (const o of occurrences) {
      const key = o.flowSlug;
      const entry = map.get(key) ?? { flowSlug: o.flowSlug, flowName: o.flowName, items: [] };
      entry.items.push(o);
      map.set(key, entry);
    }

    return Array.from(map.values())
      .map((flow) => ({
        ...flow,
        items: flow.items.sort((a, b) => stageLabel(a.stage).localeCompare(stageLabel(b.stage))),
      }))
      .sort((a, b) => b.items.length - a.items.length || a.flowName.localeCompare(b.flowName));
  }, [occurrences]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <InfoIcon className="size-4" />
        <span>
          {occurrences.length} occurrence{occurrences.length === 1 ? "" : "s"} across{" "}
          {byFlow.length} flow{byFlow.length === 1 ? "" : "s"}.
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {byFlow.map((flow) => (
          <Card key={flow.flowSlug} className="min-w-0">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">
                    <Link
                      href={`/analytics/flows/${encodeURIComponent(flow.flowSlug)}`}
                      className="underline underline-offset-4 hover:text-primary"
                    >
                      {flow.flowName}
                    </Link>
                  </CardTitle>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{flow.flowSlug}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 tabular-nums">
                  {flow.items.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {flow.items.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={cn(
                    "flex w-full items-start justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2 text-left",
                    "hover:bg-accent/30",
                  )}
                  onClick={() => setOpenId(o.id)}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{stageLabel(o.stage)}</Badge>
                      {o.source ? (
                        <Badge variant="outline" className="max-w-full truncate font-mono">
                          {o.source}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {o.description?.trim().length ? o.description : "No description"}
                    </p>
                  </div>
                  <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">Details</span>
                </button>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet
        open={openId !== null}
        onOpenChange={(v) => {
          if (!v) setOpenId(null);
        }}
      >
        <SheetContent className="w-full overflow-auto sm:max-w-xl">
          {selected ? (
            <div className="space-y-4">
              <SheetHeader>
                <SheetTitle className="break-words">{eventName}</SheetTitle>
              </SheetHeader>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{selected.flowName}</Badge>
                <Badge variant="outline">{stageLabel(selected.stage)}</Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(eventName)}
                >
                  <CopyIcon className="mr-2 size-4" />
                  Copy event name
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/analytics/flows/${encodeURIComponent(
                      selected.flowSlug,
                    )}#${occurrenceAnchorId(selected)}`}
                  >
                    <ExternalLinkIcon className="mr-2 size-4" />
                    Open in flow
                  </Link>
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Description</h3>
                <p className="text-sm text-muted-foreground">
                  {selected.description?.trim().length ? selected.description : "No description."}
                </p>
              </div>

              {selected.component ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Component</h3>
                  <div className="rounded-md border bg-muted/20 p-3 font-mono text-xs text-muted-foreground">
                    <span className="break-words">{selected.component}</span>
                  </div>
                </div>
              ) : null}

              {selected.propertiesUsed && selected.propertiesUsed.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Properties used</h3>
                  <div className="space-y-2">
                    {selected.propertiesUsed.map((p) => (
                      <div key={`${selected.id}::${p.property}`} className="rounded-md border p-3">
                        <a
                          className="font-mono text-sm underline underline-offset-4 hover:text-primary"
                          href={`/analytics/flows/${encodeURIComponent(
                            selected.flowSlug,
                          )}#prop-${encodeURIComponent(p.property)}`}
                        >
                          {p.property}
                        </a>
                        {p.context ? (
                          <p className="mt-1 text-xs text-muted-foreground">{p.context}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {selected.note ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Notes</h3>
                  <p className="text-sm text-muted-foreground">{selected.note}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

