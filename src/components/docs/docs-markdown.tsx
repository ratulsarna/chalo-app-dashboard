"use client";

import * as React from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { MermaidBlock } from "@/components/analytics/mermaid-block";
import { cn } from "@/lib/utils";
import { slugifyHeading } from "@/lib/docs/toc";

function isMermaidCodeBlock(className: string | undefined) {
  if (!className) return false;
  return /\blanguage-mermaid\b/.test(className);
}

function isInternalHref(href: string) {
  return href.startsWith("/");
}

function buildHeadingIdMap(markdown: string) {
  const idsByLine = new Map<number, string>();
  const slugCounts = new Map<string, number>();

  const lines = markdown.split(/\r?\n/);
  let inFence = false;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx] ?? "";
    const fence = line.trim().startsWith("```");
    if (fence) inFence = !inFence;
    if (inFence) continue;

    const match = /^(#{2,4})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    const rawText = match[2] ?? "";
    const base = slugifyHeading(rawText);
    const next = (slugCounts.get(base) ?? 0) + 1;
    slugCounts.set(base, next);
    const id = next === 1 ? base : `${base}-${next}`;

    // 1-based line numbers, matching remark position lines.
    idsByLine.set(idx + 1, id);
  }

  return idsByLine;
}

export function DocsMarkdown({ markdown, className }: { markdown: string; className?: string }) {
  function nodeText(node: React.ReactNode): string {
    if (node === null || node === undefined || typeof node === "boolean") return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(nodeText).join("");
    if (React.isValidElement(node)) {
      const el = node as React.ReactElement<{ children?: React.ReactNode }>;
      return nodeText(el.props.children);
    }
    return "";
  }

  // Precompute deterministic heading IDs (pure render; avoids StrictMode double-render mismatches).
  const headingIdsByLine = React.useMemo(() => buildHeadingIdMap(markdown), [markdown]);

  return (
    <article
      className={cn(
        [
          "prose prose-zinc max-w-none dark:prose-invert",
          // Better inline code styling (and remove typography plugin's injected backticks).
          "prose-code:before:content-none prose-code:after:content-none",
          "prose-code:rounded prose-code:bg-muted/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.85em]",
          // Avoid headings hiding under sticky header when anchored via TOC.
          "prose-headings:scroll-mt-28",
        ].join(" "),
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children }) {
            const safeHref = typeof href === "string" ? href : "";
            if (safeHref && isInternalHref(safeHref)) {
              // Do not forward react-markdown internal props to next/link.
              return <Link href={safeHref}>{children}</Link>;
            }

            return (
              <a href={safeHref} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
          h2({ node, children, ...props }) {
            const line = node?.position?.start?.line;
            const fallbackBase = slugifyHeading(nodeText(children));
            const id = (line ? headingIdsByLine.get(line) : undefined) ?? fallbackBase;
            return (
              <h2 id={id} {...props}>
                {children}
              </h2>
            );
          },
          h3({ node, children, ...props }) {
            const line = node?.position?.start?.line;
            const fallbackBase = slugifyHeading(nodeText(children));
            const id = (line ? headingIdsByLine.get(line) : undefined) ?? fallbackBase;
            return (
              <h3 id={id} {...props}>
                {children}
              </h3>
            );
          },
          h4({ node, children, ...props }) {
            const line = node?.position?.start?.line;
            const fallbackBase = slugifyHeading(nodeText(children));
            const id = (line ? headingIdsByLine.get(line) : undefined) ?? fallbackBase;
            return (
              <h4 id={id} {...props}>
                {children}
              </h4>
            );
          },
          table({ children }) {
            return (
              <div className="not-prose my-6 overflow-x-auto rounded-lg border bg-card/10">
                <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-muted/30">{children}</thead>;
          },
          tbody({ children }) {
            return <tbody className="[&>tr:last-child>td]:border-b-0">{children}</tbody>;
          },
          tr({ children }) {
            return <tr className="border-b border-border/60 hover:bg-muted/10">{children}</tr>;
          },
          th({ children }) {
            return (
              <th className="px-3 py-2 text-left font-semibold text-foreground/90">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-3 py-2 align-top text-foreground/85 [&_code]:text-foreground">
                {children}
              </td>
            );
          },
          code({ className, children }) {
            const raw = String(children ?? "");
            const text = raw.replace(/\n$/, "");
            const isBlock = Boolean(className) || text.includes("\n");

            if (isMermaidCodeBlock(className)) {
              return (
                <div className="not-prose my-5">
                  <MermaidBlock code={text} sizing="intrinsic" />
                </div>
              );
            }

            if (isBlock) {
              return (
                <pre className="not-prose my-5 overflow-x-auto rounded-md border bg-muted/30 p-4 text-xs leading-5">
                  <code className={cn("font-mono", className)}>
                    {text}
                  </code>
                </pre>
              );
            }

            return (
              <code
                className={cn(
                  "rounded bg-muted/30 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground/90",
                  className,
                )}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            // Render block code fences via the `code` renderer above.
            return <>{children}</>;
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
