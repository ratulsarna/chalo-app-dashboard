"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function PropertyValuesBadges({
  values,
  previewCount = 8,
  label = "Possible values",
}: {
  values: string[];
  previewCount?: number;
  label?: string;
}) {
  const normalized = React.useMemo(() => {
    const uniq = Array.from(new Set(values.filter((v) => typeof v === "string" && v.trim().length > 0)));
    uniq.sort((a, b) => a.localeCompare(b));
    return uniq;
  }, [values]);

  const [expanded, setExpanded] = React.useState(false);
  const hasMore = normalized.length > previewCount;
  const visible = expanded || !hasMore ? normalized : normalized.slice(0, previewCount);

  if (normalized.length === 0) return null;

  return (
    <div className="mt-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className={expanded ? "mt-2 max-h-32 overflow-auto pr-1" : "mt-2"}>
        <div className="flex flex-wrap gap-2">
          {visible.map((v) => (
            <Badge key={v} variant="secondary">
              {v}
            </Badge>
          ))}
        </div>
      </div>
      {hasMore ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="mt-1 h-auto px-0 py-0 text-xs"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : `Show all (${normalized.length})`}
        </Button>
      ) : null}
    </div>
  );
}

