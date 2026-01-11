"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CopyIcon, ExternalLinkIcon, SearchIcon } from "lucide-react";

import type { AnalyticsEventOccurrence } from "@/lib/analytics/types";
import { encodeEventNameForPath } from "@/lib/analytics/urls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    occurrence.component ?? "",
    occurrence.source ?? "",
    occurrence.description ?? "",
    ...(occurrence.propertiesUsed?.map((p) => `${p.property} ${p.context ?? ""}`) ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Ignore clipboard errors (e.g., insecure context).
  }
}

export function FlowEvents({ flowSlug, occurrences }: FlowEventsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState("");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const selected = React.useMemo(
    () => (openId ? occurrences.find((o) => o.id === openId) ?? null : null),
    [occurrences, openId],
  );

  const didAutoOpenFromQueryRef = React.useRef(false);
  React.useEffect(() => {
    if (didAutoOpenFromQueryRef.current) return;
    const open = searchParams.get("open");
    if (open && occurrences.some((o) => o.id === open)) setOpenId(open);
    didAutoOpenFromQueryRef.current = true;
  }, [occurrences, searchParams]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const next = q.length ? occurrences.filter((o) => occurrenceMatches(o, q)) : occurrences;
    return next.slice().sort((a, b) => a.eventName.localeCompare(b.eventName));
  }, [occurrences, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <SearchIcon className="size-4" />
          <span>
            {occurrences.length} events. Search filters by name, component, source, description, and
            properties.
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

      <div className="rounded-lg border bg-card">
        <div className="space-y-1 p-2">
          {filtered.map((o) => (
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
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{o.description}</p>
                ) : (
                  <p className="mt-0.5 text-xs text-muted-foreground">No description</p>
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
      </div>

      <Sheet
        open={openId !== null}
        onOpenChange={(v) => {
          if (!v) {
            setOpenId(null);

            // If the sheet was opened from a deep link, allow dismissing it by clearing `open`.
            const next = new URLSearchParams(searchParams.toString());
            if (next.has("open")) {
              next.delete("open");
              const qs = next.toString();
              router.replace(qs.length ? `${pathname}?${qs}` : pathname, { scroll: false });
            }
          }
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
                          return (
                            <div key={`${selected.id}::${p.property}::${idx}`} className="rounded-md border p-3">
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
