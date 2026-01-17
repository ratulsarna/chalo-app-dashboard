"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { encodeEventNameForPath } from "@/lib/analytics/urls";
import { SearchIcon } from "lucide-react";

type SearchResponse = {
  flows: Array<{ slug: string; name: string; eventCount: number; lastAudited: string | null }>;
  events: Array<{
    eventName: string;
    count: number;
    sample: Array<{ flowSlug: string; flowName: string }>;
    diagrams: Array<{ flowSlug: string; flowName: string; diagramId: string; diagramTitle: string }>;
  }>;
};

function useHotkeyCombo(key: string, handler: () => void) {
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === key) {
        event.preventDefault();
        handler();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handler, key]);
}

export function GlobalSearchCommand() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResponse | null>(null);
  const [loading, setLoading] = React.useState(false);

  useHotkeyCombo("k", () => setOpen(true));

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(null);
      return;
    }
  }, [open]);

  React.useEffect(() => {
    const q = query.trim();
    if (!open || q.length === 0) {
      setResults(null);
      return;
    }

    const abort = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/analytics/search?q=${encodeURIComponent(q)}`, {
          signal: abort.signal,
        });
        const json = (await res.json()) as SearchResponse;
        setResults(json);
      } catch {
        // ignore aborts/errors in quick-typing
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      clearTimeout(timeout);
      abort.abort();
    };
  }, [open, query]);

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-start gap-2 text-muted-foreground md:w-[420px]"
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="size-4" />
        <span>Search flows and events…</span>
        <span className="ml-auto hidden rounded border px-1.5 py-0.5 text-xs md:inline">
          ⌘K
        </span>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search flows and events"
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Type to search…"
        />
        <CommandList>
          <CommandEmpty>
            {loading ? "Searching…" : query.trim().length === 0 ? "Type to search." : "No results."}
          </CommandEmpty>

          {results?.flows && results.flows.length > 0 ? (
            <CommandGroup heading="Flows">
              {results.flows.map((flow) => (
                <CommandItem
                  key={flow.slug}
                  value={`flow:${flow.slug}`}
                  onSelect={() => {
                    setOpen(false);
                    router.push(`/analytics/flows/${encodeURIComponent(flow.slug)}`);
                  }}
                >
                  <span className="font-medium">{flow.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {flow.eventCount} events
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {results?.events && results.events.length > 0 ? (
            <>
              {results.flows && results.flows.length > 0 ? <CommandSeparator /> : null}
              <CommandGroup heading="Events">
                {results.events.map((ev) => (
                  <CommandItem
                    key={ev.eventName}
                    value={`event:${ev.eventName}`}
                    onSelect={() => {
                      setOpen(false);
                      router.push(`/analytics/events/${encodeEventNameForPath(ev.eventName)}`);
                    }}
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{ev.eventName}</span>
                      {ev.diagrams.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {ev.diagrams.length} diagram{ev.diagrams.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {ev.count}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          <CommandSeparator />
          <CommandGroup heading="Shortcuts">
            <CommandItem asChild value="go:flows">
              <Link href="/analytics/flows" onClick={() => setOpen(false)}>
                Browse all flows
              </Link>
            </CommandItem>
            <CommandItem asChild value="go:search">
              <Link href="/analytics/events" onClick={() => setOpen(false)}>
                Search events page
              </Link>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
