"use client";

import * as React from "react";
import { ChevronDownIcon, Maximize2Icon } from "lucide-react";
import Link from "next/link";

import type { AnalyticsEventOccurrence } from "@/lib/analytics/types";
import type { AnalyticsPropertyDefinition, AnalyticsPropertyKey } from "@/lib/analytics/types";
import { extractMermaidBlocks, pickDefaultMermaidBlock, type MermaidBlockMeta } from "@/lib/analytics/diagram-markdown";
import { extractNodeLabelsFromMermaid, normalizeDiagramHeading, parseDiagramLinkDirectives } from "@/lib/analytics/diagram-links";
import { MermaidDiagramViewer } from "@/components/analytics/mermaid-diagram-viewer";
import { PropertyValuesBadges } from "@/components/analytics/property-values-badges";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { encodeEventNameForPath } from "@/lib/analytics/urls";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

function getSelectedBlockId({
  blocks,
  diagramParam,
  diagramTitleParam,
}: {
  blocks: MermaidBlockMeta[];
  diagramParam: string | null;
  diagramTitleParam: string | null;
}) {
  if (diagramParam && blocks.some((b) => b.id === diagramParam)) return diagramParam;

  if (diagramTitleParam) {
    const targetKey = normalizeDiagramHeading(diagramTitleParam);
    const matches = blocks.filter((b) => normalizeDiagramHeading(b.title) === targetKey);
    if (matches.length === 1) return matches[0]?.id ?? null;
  }

  return pickDefaultMermaidBlock(blocks)?.id ?? blocks[0]?.id ?? null;
}

function occurrenceLabel(occurrence: AnalyticsEventOccurrence, index: number) {
  const parts: string[] = [`Occurrence ${index + 1}`];
  if (occurrence.component?.trim().length) parts.push(occurrence.component);
  return parts.join(" · ");
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Ignore clipboard errors (e.g., insecure context).
  }
}

function normalizeNodeLabelKey(raw: string) {
  return raw.replace(/\s+/g, " ").trim();
}

function safeId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveDiagramIdByTitle(blocks: MermaidBlockMeta[], targetTitle: string) {
  const targetKey = normalizeDiagramHeading(targetTitle);
  const matches = blocks.filter((b) => normalizeDiagramHeading(b.title) === targetKey);
  if (matches.length === 1) return matches[0]?.id ?? null;
  return null;
}

export function FlowDiagramPanel({
  flowSlug,
  diagramMarkdown,
  occurrences,
  propertyDefinitions,
  initialDiagramParam = null,
  initialDiagramTitleParam = null,
  className,
}: {
  flowSlug: string;
  diagramMarkdown: string;
  occurrences: AnalyticsEventOccurrence[];
  propertyDefinitions: Record<AnalyticsPropertyKey, AnalyticsPropertyDefinition>;
  initialDiagramParam?: string | null;
  initialDiagramTitleParam?: string | null;
  className?: string;
}) {
  const router = useRouter();
  const baseId = React.useMemo(
    () => `flow-diagram-${safeId(flowSlug) || "default"}`,
    [flowSlug],
  );
  const diagramMenuTriggerId = `${baseId}-diagram-trigger`;
  const diagramMenuContentId = `${baseId}-diagram-content`;
  const occurrenceMenuTriggerId = `${baseId}-occurrence-trigger`;
  const occurrenceMenuContentId = `${baseId}-occurrence-content`;

  const [diagramParam, setDiagramParam] = React.useState<string | null>(initialDiagramParam);
  const [diagramTitleParam, setDiagramTitleParam] = React.useState<string | null>(initialDiagramTitleParam);

  const blocks = React.useMemo(() => extractMermaidBlocks(diagramMarkdown), [diagramMarkdown]);
  const selectedId = React.useMemo(
    () => getSelectedBlockId({ blocks, diagramParam, diagramTitleParam }),
    [blocks, diagramParam, diagramTitleParam],
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

  React.useEffect(() => {
    // Canonicalize `diagramTitle` -> `diagram` once resolved.
    if (!selected) return;
    if (!diagramTitleParam) return;
    if (diagramParam) return; // already canonical

    const url = new URL(window.location.href);
    url.searchParams.set("diagram", selected.id);
    url.searchParams.delete("diagramTitle");
    window.history.replaceState({}, "", url);
    setDiagramParam(selected.id);
    setDiagramTitleParam(null);
  }, [diagramParam, diagramTitleParam, selected]);

  const diagramLinks = React.useMemo(() => {
    if (!selected) return null;

    const directives = parseDiagramLinkDirectives(selected.code);
    if (directives.length === 0) return null;

    const labelsByNodeId = extractNodeLabelsFromMermaid(selected.code);

    const byNodeId: Record<string, string> = {};
    const byLabel: Record<string, string> = {};
    const labelToDiagram = new Map<string, string | null>();

    for (const d of directives) {
      let target: string | null = null;

      if (d.targetFlowSlug) {
        const base = `/analytics/flows/${encodeURIComponent(d.targetFlowSlug)}`;
        target = d.targetTitle ? `${base}?diagramTitle=${encodeURIComponent(d.targetTitle)}` : base;
      } else if (d.targetTitle) {
        const diagramId = resolveDiagramIdByTitle(blocks, d.targetTitle);
        if (!diagramId) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              `[FlowDiagramPanel] Unresolved diagram-link target title: "${d.targetTitle}" (nodeId: ${d.nodeId})`,
            );
          }
          continue;
        }
        target = diagramId;
      }

      if (!target) continue;

      byNodeId[d.nodeId] = target;

      const label = labelsByNodeId.get(d.nodeId);
      if (!label) continue;
      const key = normalizeNodeLabelKey(label);
      if (key.length === 0) continue;

      const prev = labelToDiagram.get(key);
      if (prev === undefined) labelToDiagram.set(key, target);
      else if (prev !== target) labelToDiagram.set(key, null);
    }

    for (const [labelKey, diagramId] of labelToDiagram.entries()) {
      if (!diagramId) continue;
      byLabel[labelKey] = diagramId;
    }

    return { byNodeId, byLabel };
  }, [blocks, selected]);

  const setDiagram = React.useCallback(
    (id: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set("diagram", id);
      url.searchParams.delete("diagramTitle");
      window.history.replaceState({}, "", url);
      setDiagramParam(id);
      setDiagramTitleParam(null);
    },
    [],
  );

  const pushDiagram = React.useCallback(
    (id: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set("diagram", id);
      url.searchParams.delete("diagramTitle");
      window.history.pushState({}, "", url);
      setDiagramParam(id);
      setDiagramTitleParam(null);
    },
    [],
  );

  const onEventClick = React.useCallback((eventName: string) => {
    setOpenEventName(eventName);
  }, []);

  React.useEffect(() => {
    // Keep local state in sync with back/forward navigation.
    function onPopState() {
      const url = new URL(window.location.href);
      setDiagramParam(url.searchParams.get("diagram"));
      setDiagramTitleParam(url.searchParams.get("diagramTitle"));
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
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
                id={diagramMenuTriggerId}
                aria-controls={diagramMenuContentId}
              >
                <span className="truncate">
                  {selected.title}
                  {selected.direction ? ` · ${selected.direction}` : ""}
                </span>
                <ChevronDownIcon className="size-4 shrink-0 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              id={diagramMenuContentId}
              aria-labelledby={diagramMenuTriggerId}
              align="start"
              className="w-[min(520px,calc(100vw-2rem))]"
            >
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
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-2"
              >
                <Maximize2Icon className="size-4" />
                Expand
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full p-0 sm:max-w-6xl">
              <div className="flex h-full flex-col">
                <SheetHeader className="border-b px-6 py-4">
                  <SheetTitle className="text-base">{selected.title}</SheetTitle>
                </SheetHeader>
                <div className="flex-1 p-6">
                  <MermaidDiagramViewer
                    code={selected.code}
                    onEventClick={onEventClick}
                    diagramLinks={diagramLinks ?? undefined}
                    onDiagramLinkClick={(target) => {
                      if (target.startsWith("/")) router.push(target);
                      else pushDiagram(target);
                    }}
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
        diagramLinks={diagramLinks ?? undefined}
        onDiagramLinkClick={(target) => {
          if (target.startsWith("/")) router.push(target);
          else pushDiagram(target);
        }}
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
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-between"
                          id={occurrenceMenuTriggerId}
                          aria-controls={occurrenceMenuContentId}
                        >
                          <span className="truncate">
                            {selectedOccurrence
                              ? occurrenceLabel(
                                  selectedOccurrence,
                                  Math.max(0, matches.findIndex((o) => o.id === selectedOccurrence.id)),
                                )
                              : "Select occurrence"}
                          </span>
                          <ChevronDownIcon className="size-4 shrink-0 opacity-70" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        id={occurrenceMenuContentId}
                        aria-labelledby={occurrenceMenuTriggerId}
                        align="start"
                        className="w-[min(520px,calc(100vw-2rem))]"
                      >
                        <DropdownMenuRadioGroup
                          value={openOccurrenceId ?? ""}
                          onValueChange={(v) => setOpenOccurrenceId(v)}
                        >
                          {matches.map((o, idx) => (
                            <DropdownMenuRadioItem key={o.id} value={o.id} className="gap-3">
                              <span className="min-w-0 truncate">
                                {occurrenceLabel(o, idx)}
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
                        {selectedOccurrence.propertiesUsed.map((p, idx) => {
                          const def = propertyDefinitions?.[p.property];
                          const values = Array.isArray(def?.values) ? def.values : [];
                          return (
                            <div key={`${selectedOccurrence.id}::${p.property}::${idx}`} className="rounded-md border p-3">
                              <Link
                                className="font-mono text-sm underline underline-offset-4 hover:text-primary"
                                href={`/analytics/flows/${encodeURIComponent(flowSlug)}?tab=properties#prop-${encodeURIComponent(
                                  p.property,
                                )}`}
                              >
                                {p.property}
                              </Link>
                              {def?.type ? (
                                <p className="mt-1 text-xs text-muted-foreground">Type: {def.type}</p>
                              ) : null}
                              {p.context ? (
                                <p className="mt-1 text-xs text-muted-foreground">{p.context}</p>
                              ) : null}
                              {values.length > 0 ? <PropertyValuesBadges values={values} /> : null}
                            </div>
                          );
                        })}
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
