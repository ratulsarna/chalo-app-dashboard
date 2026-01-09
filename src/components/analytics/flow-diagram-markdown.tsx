"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidBlock } from "@/components/analytics/mermaid-block";

function isMermaidCodeBlock(className: string | undefined) {
  if (!className) return false;
  return /\blanguage-mermaid\b/.test(className);
}

export function FlowDiagramMarkdown({
  markdown,
  defaultShowSource = false,
}: {
  markdown: string;
  defaultShowSource?: boolean;
}) {
  const [showSource, setShowSource] = React.useState(defaultShowSource);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Rendered from <code>flow-diagrams.md</code>
        </p>
        <button
          type="button"
          className="text-sm underline underline-offset-4 hover:text-primary"
          onClick={() => setShowSource((v) => !v)}
        >
          {showSource ? "Hide source" : "Show source"}
        </button>
      </div>

      {showSource ? (
        <pre className="max-h-[520px] overflow-auto rounded-md bg-muted p-4 text-xs leading-5">
          {markdown}
        </pre>
      ) : null}

      <article className="prose prose-zinc max-w-none dark:prose-invert">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children, ...props }) {
              const text = String(children ?? "").replace(/\n$/, "");
              if (isMermaidCodeBlock(className)) {
                return <MermaidBlock code={text} />;
              }
              return (
                <code className={className} {...props}>
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

