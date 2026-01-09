"use client";

import * as React from "react";

let mermaidInitPromise: Promise<void> | null = null;

async function ensureMermaidInitialized() {
  if (mermaidInitPromise) return mermaidInitPromise;

  mermaidInitPromise = (async () => {
    const mermaid = (await import("mermaid")).default;

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "neutral",
    });
  })();

  return mermaidInitPromise;
}

export function MermaidBlock({ code }: { code: string }) {
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

        await ensureMermaidInitialized();
        const mermaid = (await import("mermaid")).default;

        const result = await mermaid.render(`mmd-${safeRenderId}`, code);
        if (!cancelled) setSvg(result.svg);
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
      <details className="rounded-md border bg-muted/40 p-3">
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Failed to render diagram (click to view source)
        </summary>
        <pre className="mt-3 overflow-auto text-xs leading-5">{code}</pre>
      </details>
    );
  }

  if (!svg) {
    return (
      <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
        Rendering diagram…
      </div>
    );
  }

  return (
    <div
      className="overflow-auto rounded-md border bg-white p-3 dark:bg-black"
      // Mermaid renders SVG strings; strict security level reduces risk.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
