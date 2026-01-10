"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDownIcon, Maximize2Icon } from "lucide-react";
import Link from "next/link";

import type { AnalyticsEventOccurrence } from "@/lib/analytics/types";
import { extractMermaidBlocks, pickDefaultMermaidBlock, type MermaidBlockMeta } from "@/lib/analytics/diagram-markdown";
import { MermaidDiagramViewer } from "@/components/analytics/mermaid-diagram-viewer";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { encodeEventNameForPath } from "@/lib/analytics/urls";
import { cn } from "@/lib/utils";

function getSelectedBlockId({
  blocks,
  diagramParam,
}: {
  blocks: MermaidBlockMeta[];
  diagramParam: string | null;
}) {
  if (diagramParam && blocks.some((b) => b.id === diagramParam)) return diagramParam;
  return pickDefaultMermaidBlock(blocks)?.id ?? blocks[0]?.id ?? null;
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

export function FlowDiagramPanel({
  flowSlug,
  diagramMarkdown,
  occurrences,
  className,
}: {
  flowSlug: string;
  diagramMarkdown: string;
  occurrences: AnalyticsEventOccurrence[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const blocks = React.useMemo(() => extractMermaidBlocks(diagramMarkdown), [diagramMarkdown]);
  const diagramParam = searchParams.get("diagram");
  const selectedId = React.useMemo(
    () => getSelectedBlockId({ blocks, diagramParam }),
    [blocks, diagramParam],
  );
  const [openEventName, setOpenEventName] = React.useState<string | null>(null);
  const matches = React.useMemo(
    () => (openEventName ? occurrences.filter((o) => o.eventName === openEventName) : []),
    [occurrences, openEventName],
  );
  const [openOccurrenceId, setOpenOccurrenceId] = React.useState<string | null>(null);
  const selectedOccurrence = React.useMemo(
    () => (openOccurrenceId ? matches.find((o) => o.id === openOccurrenceId) ?? null : null),
    [matches, openOccurrenceId],
  );

  const selected = React.useMemo(
    () => blocks.find((b) => b.id === selectedId) ?? null,
    [blocks, selectedId],
  );

  const setDiagram = React.useCallback(
    (id: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("diagram", id);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const onEventClick = React.useCallback((eventName: string) => {
    setOpenEventName(eventName);
  }, []);

  React.useEffect(() => {
    if (!openEventName) {
      setOpenOccurrenceId(null);
      return;
    }
    // When opening from a diagram node, pick the first match as the default selection.
    setOpenOccurrenceId(matches[0]?.id ?? null);
  }, [matches, openEventName]);

  if (!diagramMarkdown || diagramMarkdown.trim().length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No diagram file found.
      </p>
    );
  }

  if (!selected) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No <code>mermaid</code> diagram found in <code>flow-diagrams.md</code>.
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="min-w-0 flex-1 shrink justify-between gap-2 sm:max-w-[560px]"
                aria-label="Select diagram"
              >
                <span className="truncate">
                  {selected.title}
                  {selected.direction ? ` · ${selected.direction}` : ""}
                </span>
                <ChevronDownIcon className="size-4 shrink-0 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[min(520px,calc(100vw-2rem))]">
              <DropdownMenuRadioGroup value={selected.id} onValueChange={setDiagram}>
                {blocks
                  .filter((b) => b.kind !== "visual-key")
                  .map((b) => (
                    <DropdownMenuRadioItem key={b.id} value={b.id} className="gap-3">
                      <span className="min-w-0 truncate">
                        {b.title}
                        {b.direction ? ` · ${b.direction}` : ""}
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                {blocks.some((b) => b.kind === "visual-key") ? <DropdownMenuSeparator /> : null}
                {blocks
                  .filter((b) => b.kind === "visual-key")
                  .map((b) => (
                    <DropdownMenuRadioItem key={b.id} value={b.id} className="gap-3">
                      <span className="min-w-0 truncate">
                        {b.title}
                        {b.direction ? ` · ${b.direction}` : ""}
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0 gap-2">
                <Maximize2Icon className="size-4" />
                Expand
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full p-0 sm:max-w-6xl">
              <div className="flex h-full flex-col">
                <SheetHeader className="border-b px-6 py-4">
                  <SheetTitle className="text-base">
                    {selected.title}
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 p-6">
                  <MermaidDiagramViewer
                    code={selected.code}
                    onEventClick={onEventClick}
                    className="h-[calc(100vh-9.5rem)]"
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <span className="text-xs text-muted-foreground">
          {blocks.filter((b) => b.kind !== "visual-key").length} diagrams
        </span>
      </div>

      <MermaidDiagramViewer
        code={selected.code}
        onEventClick={onEventClick}
        className="h-[420px]"
      />

      <Sheet
        open={openEventName !== null}
        onOpenChange={(v) => {
          if (!v) setOpenEventName(null);
        }}
      >
        <SheetContent className="w-full p-0 sm:max-w-xl">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b pb-3 pr-12">
              <SheetTitle className="break-words">{openEventName ?? ""}</SheetTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="tabular-nums">
                  {matches.length} {matches.length === 1 ? "occurrence" : "occurrences"} in this flow
                </Badge>
                {selectedOccurrence?.stage ? (
                  <Badge variant="outline">{stageLabel(selectedOccurrence.stage)}</Badge>
                ) : null}
                {selectedOccurrence?.source ? (
                  <Badge variant="outline">{selectedOccurrence.source}</Badge>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (openEventName) void copyToClipboard(openEventName);
                  }}
                >
                  Copy event name
                </Button>
                {openEventName ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/analytics/events/${encodeEventNameForPath(openEventName)}`}>
                      Canonical event page
                    </Link>
                  </Button>
                ) : null}
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-auto p-4">
              {openEventName && matches.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    This event name appears in the diagram, but it wasn’t found in the flow’s
                    events snapshot.
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/analytics/events?q=${encodeURIComponent(openEventName)}`}>
                      Search globally
                    </Link>
                  </Button>
                </div>
              ) : null}

              {matches.length > 1 ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">Occurrence</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-between">
                          <span className="truncate">
                            {selectedOccurrence
                              ? `${stageLabel(selectedOccurrence.stage)}${selectedOccurrence.component ? ` · ${selectedOccurrence.component}` : ""}`
                              : "Select occurrence"}
                          </span>
                          <ChevronDownIcon className="size-4 shrink-0 opacity-70" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-[min(520px,calc(100vw-2rem))]">
                        <DropdownMenuRadioGroup
                          value={openOccurrenceId ?? ""}
                          onValueChange={(v) => setOpenOccurrenceId(v)}
                        >
                          {matches.map((o) => (
                            <DropdownMenuRadioItem key={o.id} value={o.id} className="gap-3">
                              <span className="min-w-0 truncate">
                                {stageLabel(o.stage)}
                                {o.component ? ` · ${o.component}` : ""}
                              </span>
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Separator />
                </div>
              ) : null}

              {selectedOccurrence ? (
                <div className="space-y-5">
                  {selectedOccurrence.component ? (
                    <div>
                      <p className="text-xs text-muted-foreground">Component</p>
                      <Badge variant="secondary" className="mt-2 max-w-full truncate font-mono">
                        {selectedOccurrence.component}
                      </Badge>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Description</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedOccurrence.description ?? "No description available."}
                    </p>
                  </div>

                  {selectedOccurrence.propertiesUsed && selectedOccurrence.propertiesUsed.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Properties used</h3>
                      <div className="space-y-2">
                        {selectedOccurrence.propertiesUsed.map((p, idx) => (
                          <div key={`${selectedOccurrence.id}::${p.property}::${idx}`} className="rounded-md border p-3">
                            <Link
                              className="font-mono text-sm underline underline-offset-4 hover:text-primary"
                              href={`/analytics/flows/${encodeURIComponent(flowSlug)}?tab=properties#prop-${encodeURIComponent(
                                p.property,
                              )}`}
                            >
                              {p.property}
                            </Link>
                            {p.context ? (
                              <p className="mt-1 text-xs text-muted-foreground">{p.context}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
