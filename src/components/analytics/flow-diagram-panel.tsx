"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDownIcon, Maximize2Icon } from "lucide-react";

import type { AnalyticsEventOccurrence } from "@/lib/analytics/types";
import { extractMermaidBlocks, pickDefaultMermaidBlock, type MermaidBlockMeta } from "@/lib/analytics/diagram-markdown";
import { MermaidDiagramViewer } from "@/components/analytics/mermaid-diagram-viewer";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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

  const selected = React.useMemo(
    () => blocks.find((b) => b.id === selectedId) ?? null,
    [blocks, selectedId],
  );

  const setDiagram = React.useCallback(
    (id: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("diagram", id);
      router.replace(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const onEventClick = React.useCallback(
    (eventName: string) => {
      const match = occurrences.find((o) => o.eventName === eventName);
      if (match) {
        router.push(
          `/analytics/flows/${encodeURIComponent(flowSlug)}?tab=events&open=${encodeURIComponent(match.id)}`,
        );
        return;
      }

      router.push(`/analytics/events?q=${encodeURIComponent(eventName)}`);
    },
    [flowSlug, occurrences, router],
  );

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
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="max-w-full justify-between gap-2">
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

          <span className="text-xs text-muted-foreground">
            {blocks.filter((b) => b.kind !== "visual-key").length} diagrams
          </span>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
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

      <MermaidDiagramViewer
        code={selected.code}
        onEventClick={onEventClick}
        className="h-[420px]"
      />
    </div>
  );
}
