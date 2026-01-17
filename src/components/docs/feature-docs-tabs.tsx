"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DocsMarkdown } from "@/components/docs/docs-markdown";
import { DocsToc } from "@/components/docs/docs-toc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DocsFeatureMeta } from "@/lib/docs/types";
import type { DocsTocItem } from "@/lib/docs/toc";

export type TabData = {
  key: string;
  label: string;
  content: string;
  exists: boolean;
  toc: DocsTocItem[];
};

export type FeatureDocsTabsProps = {
  meta: DocsFeatureMeta;
  tabs: TabData[];
  defaultTab: string;
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

export function FeatureDocsTabs({ meta, tabs, defaultTab }: FeatureDocsTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get active tab from URL or use default
  const tabParam = searchParams.get("tab");
  const validTabKeys = tabs.map((t) => t.key);
  const activeTab = tabParam && validTabKeys.includes(tabParam) ? tabParam : defaultTab;

  // Find active tab data for TOC
  const activeTabData = tabs.find((t) => t.key === activeTab);

  // Handle tab change - update URL
  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{meta.name}</h1>
            <Badge variant={statusVariant(meta.status)}>{meta.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{meta.description}</p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {meta.platforms.map((p) => (
              <Badge key={p} variant="outline">
                {p}
              </Badge>
            ))}
            {meta.hasAnalyticsFlow && meta.analyticsFlowSlug ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/analytics/flows/${encodeURIComponent(meta.analyticsFlowSlug)}`}>
                  View analytics flow
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="flex-wrap h-auto">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="data-[state=inactive]:opacity-60"
              >
                {tab.label}
                {!tab.exists && (
                  <span className="ml-1 text-xs text-muted-foreground">(missing)</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.key} value={tab.key} className="mt-6">
              {tab.exists && tab.content.trim().length > 0 ? (
                <DocsMarkdown markdown={tab.content} />
              ) : (
                <div className="space-y-4 rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                  <p>
                    This page isn&apos;t written yet. Add{" "}
                    <code>{`content/docs/features/<feature>/${tab.key}.md`}</code>.
                  </p>
                  {tabs.some((t) => t.exists && t.key !== tab.key) && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Available pages
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {tabs
                          .filter((t) => t.exists && t.key !== tab.key)
                          .map((t) => (
                            <Button
                              key={t.key}
                              size="sm"
                              variant="outline"
                              onClick={() => handleTabChange(t.key)}
                            >
                              {t.label}
                            </Button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* TOC Sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-28 space-y-6">
          {activeTabData && activeTabData.toc.length > 0 && (
            <DocsToc items={activeTabData.toc} />
          )}
        </div>
      </aside>
    </div>
  );
}
