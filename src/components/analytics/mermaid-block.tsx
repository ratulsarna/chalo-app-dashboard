"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { renderMermaidSvg } from "@/components/analytics/mermaid";

export type MermaidSizing = "responsive" | "intrinsic";

function normalizeMermaidSvg(raw: string) {
  // Mermaid's SVG output commonly includes responsive sizing like `max-width: 100%` (and/or `width="100%"`).
  // In dense diagrams this can cause everything to shrink to fit the container, making text unreadable.
  // We prefer a scrollable container with an SVG that keeps its intrinsic size.
  const svgTagMatch = raw.match(/<svg\b[^>]*>/i);
  if (!svgTagMatch) return raw;

  const svgTag = svgTagMatch[0];

  const styleAttrMatch = svgTag.match(/\sstyle=(["'])(.*?)\1/i);
  const viewBoxMatch = svgTag.match(/\sviewBox=(["'])(.*?)\1/i);

  const viewBox = viewBoxMatch?.[2]
    ?.trim()
    .split(/\s+/)
    .map((part) => Number(part))
    .filter((n) => Number.isFinite(n));
  const viewBoxWidth = viewBox && viewBox.length === 4 ? viewBox[2] : null;
  const viewBoxHeight = viewBox && viewBox.length === 4 ? viewBox[3] : null;

  let style = styleAttrMatch?.[2] ?? "";
  const maxWidthPxMatch = style.match(/max-width:\s*([0-9.]+)px/i);
  const intrinsicWidth = maxWidthPxMatch ? Number(maxWidthPxMatch[1]) : viewBoxWidth;
  const intrinsicHeight = viewBoxHeight;

  style = style
    .replace(/max-width:\s*[^;]+;?/gi, "")
    .replace(/width:\s*100%;?/gi, "")
    .trim()
    .replace(/;+\s*$/, "");

  const extras = [
    "max-width: none",
    intrinsicWidth ? `width: ${intrinsicWidth}px` : null,
  ].filter(Boolean);

  const nextStyle = [...(style ? [style] : []), ...extras].join("; ") + ";";

  let nextSvgTag = svgTag;
  if (styleAttrMatch) {
    nextSvgTag = nextSvgTag.replace(styleAttrMatch[0], ` style="${nextStyle}"`);
  } else {
    nextSvgTag = nextSvgTag.replace("<svg", `<svg style="${nextStyle}"`);
  }

  // Replace `width="100%"` / `height="100%"` with intrinsic dimensions when we can.
  if (intrinsicWidth) {
    if (/\swidth=(["'])100%\1/i.test(nextSvgTag)) {
      nextSvgTag = nextSvgTag.replace(/\swidth=(["'])100%\1/i, ` width="${intrinsicWidth}"`);
    } else if (!/\swidth=/.test(nextSvgTag)) {
      nextSvgTag = nextSvgTag.replace("<svg", `<svg width="${intrinsicWidth}"`);
    }
  }

  if (intrinsicHeight) {
    if (/\sheight=(["'])100%\1/i.test(nextSvgTag)) {
      nextSvgTag = nextSvgTag.replace(/\sheight=(["'])100%\1/i, ` height="${intrinsicHeight}"`);
    }
  }

  return raw.replace(svgTag, nextSvgTag);
}

export function MermaidBlock({
  code,
  className,
  sizing = "responsive",
}: {
  code: string;
  className?: string;
  sizing?: MermaidSizing;
}) {
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
        if (!cancelled) setSvg(sizing === "intrinsic" ? normalizeMermaidSvg(svg) : svg);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to render Mermaid diagram.";
        if (!cancelled) setError(message);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [code, safeRenderId, sizing]);

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
      className={cn(
        sizing === "intrinsic"
          ? "overflow-x-auto rounded-md border bg-muted/20 p-3 [&>svg]:block [&>svg]:max-w-none"
          : "overflow-auto rounded-md border bg-muted/20 p-3",
        className,
      )}
      // Mermaid renders SVG strings; strict security level reduces risk.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
