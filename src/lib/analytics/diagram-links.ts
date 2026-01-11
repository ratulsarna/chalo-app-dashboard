export type DiagramLinkDirective = {
  nodeId: string;
  targetTitle: string;
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
 *
 * Notes:
 * - Only `title:` targets are supported for now (same-flow navigation).
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
    if (!rhs.toLowerCase().startsWith("title:")) continue;

    const targetTitle = normalizeWhitespace(rhs.slice("title:".length));
    if (targetTitle.length === 0) continue;

    out.push({ nodeId, targetTitle });
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

  addAll(
    /(^|\n)\s*([a-zA-Z0-9_]+)\s*\(\[([^\]]+)\]\)\s*(?=$|\n)/g,
    (m) => m[2] ?? "",
    (m) => m[3] ?? "",
  );

  addAll(
    /(^|\n)\s*([a-zA-Z0-9_]+)\s*\[\s*"([^"]+)"\s*\]\s*(?=$|\n)/g,
    (m) => m[2] ?? "",
    (m) => m[3] ?? "",
  );

  addAll(
    /(^|\n)\s*([a-zA-Z0-9_]+)\s*\[\s*([^\]"]+?)\s*\]\s*(?=$|\n)/g,
    (m) => m[2] ?? "",
    (m) => m[3] ?? "",
  );

  return out;
}

