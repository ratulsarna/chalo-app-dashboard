"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidBlock } from "@/components/analytics/mermaid-block";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Maximize2Icon } from "lucide-react";

function isMermaidCodeBlock(className: string | undefined) {
  if (!className) return false;
  return /\blanguage-mermaid\b/.test(className);
}

function extractMermaidBlocks(markdown: string) {
  const blocks: Array<{ code: string; before: string }> = [];
  const matches = markdown.matchAll(/```mermaid\s*\n([\s\S]*?)```/g);
  for (const m of matches) {
    const index = m.index ?? 0;
    const before = markdown.slice(0, index).trim();
    const code = (m[1] ?? "").trim();
    if (code.length > 0) blocks.push({ code, before });
  }
  return blocks;
}

function scoreMermaid(code: string) {
  const lower = code.toLowerCase();
  let score = code.length;
  if (lower.includes("flowchart")) score += 400;
  if (lower.includes("sequencediagram")) score += 300;
  if (lower.includes("legend") || lower.includes("visual key")) score -= 250;
  return score;
}

function compactText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_-]{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function FlowDiagramPreview({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  const best = React.useMemo(() => {
    const blocks = extractMermaidBlocks(markdown);
    if (blocks.length === 0) return null;
    return blocks.sort((a, b) => scoreMermaid(b.code) - scoreMermaid(a.code))[0] ?? null;
  }, [markdown]);

  const intro = React.useMemo(() => compactText(best?.before ?? ""), [best?.before]);

  if (!best) {
    return (
      <div className={cn("space-y-3", className)}>
        <p className="text-sm text-muted-foreground">
          No <code>mermaid</code> diagram found in <code>flow-diagrams.md</code>.
        </p>
        <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          {intro.length > 0 ? intro : "Add a ```mermaid``` code block to render a diagram preview here."}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-end">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Maximize2Icon className="size-4" />
              Expand
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full p-0 sm:max-w-5xl">
            <div className="flex h-full flex-col">
              <SheetHeader className="border-b px-6 py-4">
                <SheetTitle className="text-base">Flow diagram</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-auto p-6">
                <MermaidBlock code={best.code} className="h-[calc(100vh-10rem)]" />
                <details className="mt-4 rounded-md border bg-muted/20 p-3">
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    View Mermaid source
                  </summary>
                  <pre className="mt-3 overflow-auto text-xs leading-5">{best.code}</pre>
                </details>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <MermaidBlock code={best.code} className="max-h-[420px]" />
      {intro.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          {intro.length > 220 ? `${intro.slice(0, 220)}…` : intro}
        </p>
      ) : null}
    </div>
  );
}

export function FlowDiagramMarkdown({
  markdown,
  className,
  defaultShowSource = false,
}: {
  markdown: string;
  className?: string;
  defaultShowSource?: boolean;
}) {
  const [showSource, setShowSource] = React.useState(defaultShowSource);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          From <code>flow-diagrams.md</code>
        </p>
        <button
          type="button"
          className="text-xs underline underline-offset-4 hover:text-primary"
          onClick={() => setShowSource((v) => !v)}
        >
          {showSource ? "Hide source" : "Show source"}
        </button>
      </div>

      {showSource ? (
        <pre className="max-h-[420px] overflow-auto rounded-md bg-muted p-4 text-xs leading-5">
          {markdown}
        </pre>
      ) : null}

      <article className="prose prose-zinc max-w-none dark:prose-invert">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children }) {
              const text = String(children ?? "").replace(/\n$/, "");
              if (isMermaidCodeBlock(className)) {
                return <MermaidBlock code={text} />;
              }
              return (
                <code className={className}>
                  {children}
                </code>
              );
            },
            pre({ children }) {
              return <>{children}</>;
            },
          }}
        >
          {markdown}
        </ReactMarkdown>
      </article>
    </div>
  );
}
