"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { renderMermaidSvg } from "@/components/analytics/mermaid";

export function MermaidBlock({ code, className }: { code: string; className?: string }) {
  const [svg, setSvg] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const renderId = React.useId();
  const safeRenderId = React.useMemo(
    () => renderId.replace(/[^a-zA-Z0-9_-]/g, "_"),
    [renderId],
  );

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setError(null);
        setSvg(null);

        const svg = await renderMermaidSvg(`mmd-${safeRenderId}`, code);
        if (!cancelled) setSvg(svg);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to render Mermaid diagram.";
        if (!cancelled) setError(message);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [code, safeRenderId]);

  if (error) {
    return (
      <details className={cn("rounded-md border bg-muted/40 p-3", className)}>
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Failed to render diagram (click to view source)
        </summary>
        <pre className="mt-3 overflow-auto text-xs leading-5">{code}</pre>
      </details>
    );
  }

  if (!svg) {
    return (
      <div className={cn("rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground", className)}>
        Rendering diagram…
      </div>
    );
  }

  return (
    <div
      className={cn("overflow-auto rounded-md border bg-muted/20 p-3", className)}
      // Mermaid renders SVG strings; strict security level reduces risk.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
