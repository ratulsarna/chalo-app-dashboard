"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { GlobalSearchCommand } from "@/components/analytics/global-search-command";

export type AnalyticsNavFlow = {
  slug: string;
  name: string;
  description?: string | null;
  lastAudited?: string | null;
  eventCount: number;
};

function FlowNavList({
  flows,
  className,
}: {
  flows: AnalyticsNavFlow[];
  className?: string;
}) {
  const pathname = usePathname();
  const [filter, setFilter] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return flows;
    return flows.filter((f) => `${f.name} ${f.slug}`.toLowerCase().includes(q));
  }, [filter, flows]);

  return (
    <div className={cn("flex h-full flex-col gap-3", className)}>
      <div className="px-3 pt-3">
        <Input
          placeholder="Filter flows…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <ScrollArea className="flex-1 px-2 pb-3">
        <div className="space-y-1">
          {filtered.map((flow) => {
            const href = `/analytics/flows/${encodeURIComponent(flow.slug)}`;
            const active = pathname === href;
            return (
              <Link
                key={flow.slug}
                href={href}
                className={cn(
                  "group flex items-start justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{flow.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{flow.slug}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground group-hover:text-foreground">
                  {flow.eventCount}
                </span>
              </Link>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export function AnalyticsShell({
  flows,
  children,
}: {
  flows: AnalyticsNavFlow[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 border-r bg-background md:flex md:flex-col">
        <div className="px-4 py-3">
          <Link href="/analytics" className="text-sm font-semibold tracking-tight">
            Analytics
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            Flows, events, and instrumentation docs.
          </p>
        </div>
        <FlowNavList flows={flows} className="min-h-0" />
      </aside>

      {/* Main */}
      <div className="min-w-0 flex-1">
        <div className="sticky top-14 z-40 border-b bg-background/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
            {/* Mobile nav */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <MenuIcon className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetHeader className="px-4 py-3">
                  <SheetTitle>Analytics</SheetTitle>
                </SheetHeader>
                <FlowNavList flows={flows} />
              </SheetContent>
            </Sheet>

            <GlobalSearchCommand />

            <div className="ml-auto hidden items-center gap-2 md:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/analytics/flows">Flows</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/analytics/events">Events</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </div>
    </div>
  );
}

