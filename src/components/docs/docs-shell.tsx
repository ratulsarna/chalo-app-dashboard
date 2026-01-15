"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type DocsNavOverview = {
  slug: string;
  name: string;
  description: string;
  status: string;
};

export type DocsNavFeature = {
  slug: string;
  name: string;
  description: string;
  status: string;
};

function statusVariant(status: string): React.ComponentProps<typeof Badge>["variant"] {
  switch (status) {
    case "reviewed":
      return "default";
    case "draft":
      return "secondary";
    case "stale":
      return "destructive";
    case "pending":
    default:
      return "outline";
  }
}

function DocsNavList({
  overviews,
  features,
  className,
}: {
  overviews: DocsNavOverview[];
  features: DocsNavFeature[];
  className?: string;
}) {
  const pathname = usePathname();
  const [filter, setFilter] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return { overviews, features };
    return {
      overviews: overviews.filter((o) => `${o.name} ${o.slug}`.toLowerCase().includes(q)),
      features: features.filter((f) => `${f.name} ${f.slug}`.toLowerCase().includes(q)),
    };
  }, [features, filter, overviews]);

  return (
    <div className={cn("flex h-full flex-col gap-3", className)}>
      <div className="px-4 pt-3">
        <Input placeholder="Filter docs…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-3">
        <div className="w-full space-y-4 px-2 pr-4">
          <div className="space-y-2">
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Overview
            </p>
            <div className="space-y-1">
              {filtered.overviews.map((item) => {
                const href = `/docs/overview/${encodeURIComponent(item.slug)}`;
                const active = pathname === href;
                return (
                  <Link
                    key={item.slug}
                    href={href}
                    className={cn(
                      "flex w-full min-w-0 items-start justify-between gap-3 rounded-md pl-3 pr-4 py-2 text-sm transition-colors",
                      active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                    )}
                  >
                    <span className="min-w-0 truncate font-medium">{item.name}</span>
                    <Badge variant={statusVariant(item.status)} className="shrink-0">
                      {item.status}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Features
            </p>
            <div className="space-y-1">
              {filtered.features.map((item) => {
                const href = `/docs/features/${encodeURIComponent(item.slug)}`;
                const active = pathname === href || pathname?.startsWith(`${href}/`);
                return (
                  <Link
                    key={item.slug}
                    href={href}
                    className={cn(
                      "flex w-full min-w-0 items-start justify-between gap-3 rounded-md pl-3 pr-4 py-2 text-sm transition-colors",
                      active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                    )}
                  >
                    <span className="min-w-0 truncate font-medium">{item.name}</span>
                    <Badge variant={statusVariant(item.status)} className="shrink-0">
                      {item.status}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DocsShell({
  overviews,
  features,
  children,
}: {
  overviews: DocsNavOverview[];
  features: DocsNavFeature[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="hidden w-80 shrink-0 border-r bg-background md:flex md:flex-col">
        <div className="px-4 py-3">
          <Link href="/docs" className="text-sm font-semibold tracking-tight">
            Docs
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            Architecture notes, feature designs, and codebase references.
          </p>
        </div>
        <DocsNavList overviews={overviews} features={features} className="min-h-0" />
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-14 z-40 border-b bg-background/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <MenuIcon className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetHeader className="px-4 py-3">
                  <SheetTitle>Docs</SheetTitle>
                </SheetHeader>
                <DocsNavList overviews={overviews} features={features} />
              </SheetContent>
            </Sheet>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Documentation</p>
              <p className="truncate text-xs text-muted-foreground">
                Browse by overview or feature.
              </p>
            </div>

            <div className="ml-auto hidden items-center gap-2 md:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/docs">Home</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </div>
    </div>
  );
}
