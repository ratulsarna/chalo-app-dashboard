export type MermaidBlockMeta = {
  /**
   * Stable id for URL query params. Derived from title + index.
   */
  id: string;
  /**
   * Human label derived from nearest preceding heading or nearby "Visual key" marker.
   */
  title: string;
  /**
   * Mermaid source code (no surrounding fences).
   */
  code: string;
  /**
   * Rough classification to hide legend blocks by default.
   */
  kind: "visual-key" | "diagram";
  /**
   * Mermaid direction for flowcharts, e.g. "LR", "TD".
   */
  direction?: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function extractFlowchartDirection(code: string) {
  const match = code.match(/^\s*flowchart\s+([a-z]{2})\b/i);
  return match?.[1]?.toUpperCase();
}

function isLikelyVisualKey(title: string, nearbyText: string, code: string) {
  const t = `${title} ${nearbyText}`.toLowerCase();
  if (t.includes("visual key") || t.includes("legend")) return true;

  // Many docs include a small generic "ui -> event" legend block.
  const lower = code.toLowerCase();
  const hasGenericLegend =
    lower.includes("analytics event name") &&
    (lower.includes("screen / state / branch") || lower.includes("screen/state/branch"));

  return hasGenericLegend && code.length < 700;
}

/**
 * Extracts all ```mermaid code blocks from a markdown document and labels them.
 *
 * Labeling heuristic:
 * - Prefer the nearest preceding markdown heading (##/###/####).
 * - If "Visual key" is found in the nearby preceding text, label as "Visual key".
 */
export function extractMermaidBlocks(markdown: string): MermaidBlockMeta[] {
  const lines = markdown.split(/\r?\n/);
  let lastHeading = "";

  const blocks: MermaidBlockMeta[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      lastHeading = (headingMatch[2] ?? "").trim();
      continue;
    }

    if (!/^\s*```mermaid\s*$/i.test(line)) continue;

    const startLine = i;
    const start = i + 1;
    let end = start;
    while (end < lines.length && !/^\s*```\s*$/.test(lines[end] ?? "")) end++;
    const code = lines.slice(start, end).join("\n").trim();
    i = end; // advance past closing fence

    if (code.length === 0) continue;

    const lookbackStart = Math.max(0, startLine - 12);
    const nearbyText = lines.slice(lookbackStart, startLine).join("\n");

    const hasVisualKeyMarker = /\bvisual key\b/i.test(nearbyText);
    const title = hasVisualKeyMarker ? "Visual key" : lastHeading.trim() || `Diagram ${blocks.length + 1}`;

    const kind: MermaidBlockMeta["kind"] = isLikelyVisualKey(title, nearbyText, code) ? "visual-key" : "diagram";
    const direction = extractFlowchartDirection(code);

    const idBase = slugify(title) || "diagram";
    const id = `${idBase}-${blocks.length + 1}`;

    blocks.push({ id, title, code, kind, direction });
  }

  return blocks;
}

/**
 * Default selection heuristic (per product decision):
 * - Use the first non-visual-key block in document order.
 */
export function pickDefaultMermaidBlock(blocks: MermaidBlockMeta[]) {
  return blocks.find((b) => b.kind !== "visual-key") ?? blocks[0] ?? null;
}
