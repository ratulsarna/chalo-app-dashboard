"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CopyIcon, ExternalLinkIcon, SearchIcon } from "lucide-react";

import type { AnalyticsEventOccurrence } from "@/lib/analytics/types";
import { encodeEventNameForPath } from "@/lib/analytics/urls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type FlowEventsProps = {
  flowSlug: string;
  occurrences: AnalyticsEventOccurrence[];
};

function occurrenceMatches(occurrence: AnalyticsEventOccurrence, q: string) {
  const haystack = [
    occurrence.eventName,
    occurrence.stage ?? "",
    occurrence.component ?? "",
    occurrence.source ?? "",
    occurrence.description ?? "",
    ...(occurrence.propertiesUsed?.map((p) => `${p.property} ${p.context ?? ""}`) ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

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

export function FlowEvents({ flowSlug, occurrences }: FlowEventsProps) {
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState("");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const selected = React.useMemo(
    () => (openId ? occurrences.find((o) => o.id === openId) ?? null : null),
    [occurrences, openId],
  );

  React.useEffect(() => {
    if (openId !== null) return;
    const open = searchParams.get("open");
    if (!open) return;
    if (occurrences.some((o) => o.id === open)) setOpenId(open);
  }, [occurrences, openId, searchParams]);

  const defaultOpenStages = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of occurrences) {
      const key = stageLabel(o.stage);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort(([aStage, aCount], [bStage, bCount]) => {
        if (aStage === "Unstaged" && bStage !== "Unstaged") return 1;
        if (bStage === "Unstaged" && aStage !== "Unstaged") return -1;
        if (bCount !== aCount) return bCount - aCount;
        return aStage.localeCompare(bStage);
      })
      .slice(0, 2)
      .map(([stage]) => stage);
  }, [occurrences]);

  const grouped = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q.length ? occurrences.filter((o) => occurrenceMatches(o, q)) : occurrences;

    const map = new Map<string, AnalyticsEventOccurrence[]>();
    for (const o of filtered) {
      const key = stageLabel(o.stage);
      const list = map.get(key) ?? [];
      list.push(o);
      map.set(key, list);
    }

    // Stable ordering: keep common stages first by count, then alpha.
    const entries = Array.from(map.entries()).sort(([aStage, aList], [bStage, bList]) => {
      if (aStage === "Unstaged" && bStage !== "Unstaged") return 1;
      if (bStage === "Unstaged" && aStage !== "Unstaged") return -1;
      if (bList.length !== aList.length) return bList.length - aList.length;
      return aStage.localeCompare(bStage);
    });

    return entries.map(([stage, list]) => ({
      stage,
      events: list.sort((a, b) => a.eventName.localeCompare(b.eventName)),
    }));
  }, [occurrences, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <SearchIcon className="size-4" />
          <span>
            {occurrences.length} events. Search filters by name, stage, component, description,
            and properties.
          </span>
        </div>
        <div className="md:w-[360px]">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search within this flow…"
          />
        </div>
      </div>

      <Accordion type="multiple" defaultValue={defaultOpenStages} className="rounded-lg border bg-card">
        {grouped.map(({ stage, events }) => (
          <AccordionItem key={stage} value={stage} className="px-2">
            <AccordionTrigger className="px-2">
              <div className="flex w-full items-center justify-between gap-3">
                <span className="truncate text-left">{stage}</span>
                <Badge variant="secondary" className="shrink-0">
                  {events.length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-1 px-2">
                {events.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors",
                      "hover:bg-accent/50",
                    )}
                    onClick={() => setOpenId(o.id)}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{o.eventName}</p>
                      {o.description ? (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {o.description}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          No description
                        </p>
                      )}
                      {o.propertiesUsed && o.propertiesUsed.length > 0 ? (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          Props:{" "}
                          {o.propertiesUsed
                            .slice(0, 4)
                            .map((p) => p.property)
                            .join(", ")}
                          {o.propertiesUsed.length > 4 ? "…" : ""}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 pt-0.5 text-xs text-muted-foreground">
                      {o.component ? "Details" : "Open"}
                    </div>
                  </button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Sheet
        open={openId !== null}
        onOpenChange={(v) => {
          if (!v) setOpenId(null);
        }}
      >
        <SheetContent className="w-full overflow-auto sm:max-w-xl">
          {selected ? (
            <div className="pb-6">
              <SheetHeader className="pb-3 pr-12">
                <SheetTitle className="break-words">{selected.eventName}</SheetTitle>
              </SheetHeader>

              <div className="space-y-5 px-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{stageLabel(selected.stage)}</Badge>
                  {selected.source ? <Badge variant="outline">{selected.source}</Badge> : null}
                  {selected.component ? (
                    <Badge variant="secondary" className="max-w-full truncate font-mono">
                      {selected.component}
                    </Badge>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(selected.eventName)}
                  >
                    <CopyIcon className="mr-2 size-4" />
                    Copy event name
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/analytics/events/${encodeEventNameForPath(selected.eventName)}`}>
                      <ExternalLinkIcon className="mr-2 size-4" />
                      Canonical event page
                    </Link>
                  </Button>
                </div>

                <Separator className="-mx-4" />

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Description</h3>
                  <p className="text-sm text-muted-foreground">
                    {selected.description ?? "No description available."}
                  </p>
                </div>

                {selected.propertiesUsed && selected.propertiesUsed.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Properties used</h3>
                    <div className="space-y-2">
                      {selected.propertiesUsed.map((p, idx) => {
                        const rawProperty = (p as { property?: unknown }).property;
                        const property = typeof rawProperty === "string" && rawProperty.trim().length > 0
                          ? rawProperty
                          : null;
                        return (
                          <div key={`${selected.id}::${property ?? "missing"}::${idx}`} className="rounded-md border p-3">
                            {property ? (
                              <a
                                className="font-mono text-sm underline underline-offset-4 hover:text-primary"
                                href={`/analytics/flows/${encodeURIComponent(flowSlug)}#prop-${encodeURIComponent(
                                  property,
                                )}`}
                              >
                                {property}
                              </a>
                            ) : (
                              <span className="font-mono text-sm text-muted-foreground">
                                (missing property key)
                              </span>
                            )}
                            {p.context ? (
                              <p className="mt-1 text-xs text-muted-foreground">{p.context}</p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
