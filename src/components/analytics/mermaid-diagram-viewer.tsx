"use client";

import * as React from "react";
import { MinusIcon, MoveIcon, PlusIcon, RotateCcwIcon, ScanIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { renderMermaidSvg } from "@/components/analytics/mermaid";

const MIN_SCALE = 0.08;
const MAX_SCALE = 5;

type ViewTransform = {
  scale: number;
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeLabel(raw: string) {
  return raw.replace(/\s+/g, " ").trim();
}

function getNodeLabel(node: SVGGElement) {
  const foreign = node.querySelector("foreignObject");
  const textSource = foreign ? foreign : node;
  return normalizeLabel(textSource.textContent ?? "");
}

function isEventNode(node: SVGGElement) {
  if (node.classList.contains("event")) return true;

  // Fallback: compare fill to the known event green color.
  const shape = node.querySelector<SVGElement>("rect, polygon, ellipse, path");
  if (!shape) return false;

  // Mermaid often applies fills via CSS, not attributes.
  const fillAttr = (shape.getAttribute("fill") ?? shape.getAttribute("style") ?? "").toLowerCase();
  if (fillAttr.includes("#166534")) return true;

  const computedFill = window.getComputedStyle(shape).fill.toLowerCase();
  return computedFill.includes("rgb(22, 101, 52)") || computedFill.includes("#166534");
}

function svgBBox(svg: SVGSVGElement) {
  // Prefer viewBox when available: Mermaid sometimes produces elements that sit far outside the
  // visible viewBox (e.g., markers/paths), which can inflate `getBBox()` and make fit-to-screen
  // zoom way too far out (tiny diagrams anchored near the top).
  const vb = svg.viewBox?.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) {
    return { x: vb.x, y: vb.y, width: vb.width, height: vb.height } as DOMRect;
  }

  try {
    return svg.getBBox();
  } catch {
    return { x: 0, y: 0, width: 1000, height: 800 } as DOMRect;
  }
}

function computeFit(container: HTMLDivElement, svg: SVGSVGElement): ViewTransform {
  const pad = 24;
  const rect = container.getBoundingClientRect();
  const bbox = svgBBox(svg);

  const availableW = Math.max(1, rect.width - pad * 2);
  const availableH = Math.max(1, rect.height - pad * 2);
  const scale = clamp(Math.min(availableW / bbox.width, availableH / bbox.height), MIN_SCALE, MAX_SCALE);

  const x = rect.width / 2 - (bbox.x + bbox.width / 2) * scale;
  const y = rect.height / 2 - (bbox.y + bbox.height / 2) * scale;

  return { scale, x, y };
}

export function MermaidDiagramViewer({
  code,
  className,
  onEventClick,
}: {
  code: string;
  className?: string;
  onEventClick?: (eventName: string) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const svgHostRef = React.useRef<HTMLDivElement | null>(null);
  const [svg, setSvg] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [transform, setTransform] = React.useState<ViewTransform>({ scale: 1, x: 0, y: 0 });
  const renderId = React.useId();

  const safeRenderId = React.useMemo(
    () => renderId.replace(/[^a-zA-Z0-9_-]/g, "_"),
    [renderId],
  );

  const applyFit = React.useCallback(() => {
    const container = containerRef.current;
    const svgEl = svgHostRef.current?.querySelector("svg") as SVGSVGElement | null;
    if (!container || !svgEl) return;
    setTransform(computeFit(container, svgEl));
  }, []);

  const applyReset = React.useCallback(() => {
    const container = containerRef.current;
    const svgEl = svgHostRef.current?.querySelector("svg") as SVGSVGElement | null;
    if (!container || !svgEl) return;
    const bbox = svgBBox(svgEl);
    const rect = container.getBoundingClientRect();
    const x = rect.width / 2 - (bbox.x + bbox.width / 2) * 1;
    const y = rect.height / 2 - (bbox.y + bbox.height / 2) * 1;
    setTransform({ scale: 1, x, y });
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setError(null);
        setSvg(null);
        const svg = await renderMermaidSvg(`mmdv-${safeRenderId}`, code);
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

  // Inject and enhance rendered SVG: mark event nodes clickable (green convention) and add hover styles.
  //
  // NOTE: We avoid `dangerouslySetInnerHTML` in JSX because React may re-assign `innerHTML` on
  // unrelated re-renders (e.g., pan/zoom state), wiping any DOM enhancements we apply.
  React.useEffect(() => {
    const host = svgHostRef.current;
    if (!host) return;

    host.innerHTML = svg ?? "";

    const svgEl = host.querySelector("svg") as SVGSVGElement | null;
    if (!svgEl) return;

    svgEl.setAttribute("data-mermaid-root", "1");

    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `
      .analytics-event-node { cursor: pointer; }
      .analytics-event-node:hover rect,
      .analytics-event-node:hover polygon,
      .analytics-event-node:hover path {
        stroke-width: 2px !important;
      }
    `;
    // Avoid accumulating multiple <style> tags if mermaid re-renders.
    svgEl.querySelectorAll("style[data-analytics-style='1']").forEach((n) => n.remove());
    style.setAttribute("data-analytics-style", "1");
    svgEl.prepend(style);

    const nodes = Array.from(svgEl.querySelectorAll<SVGGElement>("g.node"));
    for (const node of nodes) {
      if (!isEventNode(node)) continue;
      node.classList.add("analytics-event-node");
      const label = getNodeLabel(node);
      if (label.length > 0) node.setAttribute("data-analytics-event", label);
    }
  }, [svg]);

  // Fit-to-screen after SVG is injected and whenever the container is resized.
  React.useEffect(() => {
    applyFit();

    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => applyFit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [applyFit, svg]);

  const zoomBy = React.useCallback((factor: number, centerX?: number, centerY?: number) => {
    setTransform((t) => {
      const container = containerRef.current;
      if (!container) return t;

      const rect = container.getBoundingClientRect();
      const cx = centerX ?? rect.width / 2;
      const cy = centerY ?? rect.height / 2;

      const nextScale = clamp(t.scale * factor, MIN_SCALE, MAX_SCALE);
      const ratio = nextScale / t.scale;

      // Keep the cursor (or center) position stable while zooming.
      const x = cx - (cx - t.x) * ratio;
      const y = cy - (cy - t.y) * ratio;

      return { scale: nextScale, x, y };
    });
  }, []);

  // NOTE: We use a native wheel listener with `{ passive: false }` because React/Chrome can
  // treat wheel listeners as passive, which prevents `preventDefault()` and causes scroll chaining
  // (diagram zoom + page scroll). This must reliably block page scrolling while zooming.
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerEl: HTMLDivElement = container;

    function onWheel(event: WheelEvent) {
      // Trackpads can be noisy; keep the multiplier small.
      const delta = -event.deltaY;
      if (Math.abs(delta) < 1) return;

      event.preventDefault();

      const rect = containerEl.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;

      const factor = delta > 0 ? 1.08 : 0.92;
      zoomBy(factor, offsetX, offsetY);
    }

    containerEl.addEventListener("wheel", onWheel, { passive: false });
    return () => containerEl.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  const draggingRef = React.useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    didDrag: boolean;
    captured: boolean;
  }>({ active: false, pointerId: null, startX: 0, startY: 0, originX: 0, originY: 0, didDrag: false, captured: false });

  const onPointerDown = React.useCallback((event: React.PointerEvent) => {
    // Only left click / primary touch.
    if (event.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;

    draggingRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.x,
      originY: transform.y,
      didDrag: false,
      captured: false,
    };
  }, [transform.x, transform.y]);

  const onPointerMove = React.useCallback((event: React.PointerEvent) => {
    if (!draggingRef.current.active) return;
    const dx = event.clientX - draggingRef.current.startX;
    const dy = event.clientY - draggingRef.current.startY;
    if (!draggingRef.current.didDrag && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      draggingRef.current.didDrag = true;

      // Only capture the pointer once we're actually dragging. Capturing immediately can cause
      // clicks on SVG nodes to have the container as the event target, preventing node detection.
      if (!draggingRef.current.captured && draggingRef.current.pointerId !== null) {
        (event.currentTarget as HTMLDivElement).setPointerCapture(draggingRef.current.pointerId);
        draggingRef.current.captured = true;
      }
    }
    setTransform((t) => ({ ...t, x: draggingRef.current.originX + dx, y: draggingRef.current.originY + dy }));
  }, []);

  const onPointerUp = React.useCallback((event: React.PointerEvent) => {
    if (draggingRef.current.captured && draggingRef.current.pointerId !== null) {
      try {
        (event.currentTarget as HTMLDivElement).releasePointerCapture(draggingRef.current.pointerId);
      } catch {
        // ignore
      }
    }
    draggingRef.current.active = false;
    draggingRef.current.pointerId = null;
    draggingRef.current.captured = false;
  }, []);

  const onClick = React.useCallback((event: React.MouseEvent) => {
    if (!onEventClick) return;
    if (draggingRef.current.didDrag) return;
    const target = event.target as Element | null;
    if (!target) return;

    const node = target.closest("g.node") as SVGGElement | null;
    if (!node) return;
    const label = node.getAttribute("data-analytics-event");
    if (!label) return;
    if (!node.classList.contains("analytics-event-node")) return;

    onEventClick(label);
  }, [onEventClick]);

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

  return (
    <div className={cn("relative rounded-md border bg-muted/20", className)}>
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border bg-background/80 p-1 shadow-sm backdrop-blur">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={applyFit}
          aria-label="Fit to screen"
        >
          <ScanIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => zoomBy(1.15)}
          aria-label="Zoom in"
        >
          <PlusIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => zoomBy(0.87)}
          aria-label="Zoom out"
        >
          <MinusIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={applyReset}
          aria-label="Reset zoom"
        >
          <RotateCcwIcon className="size-4" />
        </Button>
      </div>

      <div
        ref={containerRef}
        className="relative h-full min-h-[240px] overflow-hidden overscroll-contain select-none touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onClick}
        role="application"
        aria-label="Diagram viewer"
      >
        <div className="absolute left-2 top-2 z-10 hidden items-center gap-2 rounded-md border bg-background/80 px-2 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur md:flex">
          <MoveIcon className="size-3.5" />
          Drag to pan, wheel to zoom
        </div>

        <div
          ref={svgHostRef}
          className="absolute inset-0"
          data-diagram-host="1"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: "0 0",
          }}
        />

        {!svg ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Rendering diagram…
          </div>
        ) : null}
      </div>
    </div>
  );
}
