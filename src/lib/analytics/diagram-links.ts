export type DiagramLinkDirective = {
  nodeId: string;
  targetTitle?: string;
  targetFlowSlug?: string;
};

function normalizeWhitespace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

export function normalizeDiagramHeading(input: string) {
  return normalizeWhitespace(input).toLowerCase();
}

/**
 * Parses Mermaid comment directives of the form:
 *   %%chalo:diagram-link <nodeId> -> title:<diagramHeading>
 *   %%chalo:diagram-link <nodeId> -> flow:<flowSlug>
 *   %%chalo:diagram-link <nodeId> -> flow:<flowSlug> title:<diagramHeading>
 *
 * Notes:
 * - `title:` without `flow:` is same-flow navigation.
 * - With `flow:`, navigation is cross-flow (optionally to a diagram title).
 * - Invalid directives are ignored.
 */
export function parseDiagramLinkDirectives(mermaidCode: string): DiagramLinkDirective[] {
  const out: DiagramLinkDirective[] = [];
  const lines = mermaidCode.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith("%%chalo:diagram-link")) continue;

    const rest = line.slice("%%chalo:diagram-link".length).trim();
    const arrowIdx = rest.indexOf("->");
    if (arrowIdx < 0) continue;

    const nodeId = rest.slice(0, arrowIdx).trim();
    if (!/^[a-zA-Z0-9_]+$/.test(nodeId)) continue;

    const rhs = rest.slice(arrowIdx + 2).trim();
    const lower = rhs.toLowerCase();

    // Same-flow: title:<diagramHeading>
    if (lower.startsWith("title:")) {
      const targetTitle = normalizeWhitespace(rhs.slice("title:".length));
      if (targetTitle.length === 0) continue;
      out.push({ nodeId, targetTitle });
      continue;
    }

    // Cross-flow: flow:<flowSlug> [title:<diagramHeading>]
    if (lower.startsWith("flow:")) {
      const match = rhs.match(/^flow:\s*([a-z0-9-]+)(?:\s+title:\s*(.+))?$/i);
      const targetFlowSlug = (match?.[1] ?? "").trim();
      if (!/^[a-z0-9-]+$/i.test(targetFlowSlug)) continue;

      const rawTitle = match?.[2];
      const targetTitle = rawTitle ? normalizeWhitespace(rawTitle) : undefined;
      if (targetTitle && targetTitle.length === 0) continue;

      out.push({ nodeId, targetFlowSlug, targetTitle });
      continue;
    }
  }

  return out;
}

/**
 * Best-effort mapping from Mermaid node id -> rendered label text, for common patterns used
 * in `flow-diagrams.md`.
 *
 * Supported:
 * - nodeId([Label])
 * - nodeId["Label"]
 * - nodeId[Label]
 */
export function extractNodeLabelsFromMermaid(code: string) {
  const out = new Map<string, string>();

  function addAll(re: RegExp, getId: (m: RegExpMatchArray) => string, getLabel: (m: RegExpMatchArray) => string) {
    for (const m of code.matchAll(re)) {
      const id = getId(m);
      if (out.has(id)) continue;
      const label = normalizeWhitespace(getLabel(m));
      if (label.length === 0) continue;
      out.set(id, label);
    }
  }

  // Match nodeId(["label"]) - stadium shape with quoted label
  addAll(
    /\b([a-zA-Z0-9_]+)\s*\(\[\s*"([^"]+)"\s*\]\)/g,
    (m) => m[1] ?? "",
    (m) => m[2] ?? "",
  );

  // Match nodeId([label]) - stadium shape with unquoted label
  addAll(
    /\b([a-zA-Z0-9_]+)\s*\(\[([^\]]+)\]\)/g,
    (m) => m[1] ?? "",
    (m) => m[2] ?? "",
  );

  // Match nodeId["label"] - box with quoted label
  addAll(
    /\b([a-zA-Z0-9_]+)\s*\[\s*"([^"]+)"\s*\]/g,
    (m) => m[1] ?? "",
    (m) => m[2] ?? "",
  );

  // Match nodeId[label] - box with unquoted label (avoid matching [...] links)
  addAll(
    /\b([a-zA-Z0-9_]+)\s*\[\s*([^\]"]+?)\s*\]/g,
    (m) => m[1] ?? "",
    (m) => m[2] ?? "",
  );

  return out;
}

