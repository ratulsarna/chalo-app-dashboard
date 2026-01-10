"use client";

let mermaidInitPromise: Promise<void> | null = null;

export async function ensureMermaidInitialized() {
  if (mermaidInitPromise) return mermaidInitPromise;

  mermaidInitPromise = (async () => {
    const mermaid = (await import("mermaid")).default;

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      // This app defaults to dark mode; keep Mermaid consistent/readable.
      theme: "dark",
    });
  })();

  return mermaidInitPromise;
}

export async function renderMermaidSvg(renderId: string, code: string) {
  await ensureMermaidInitialized();
  const mermaid = (await import("mermaid")).default;
  return (await mermaid.render(renderId, code)).svg;
}

