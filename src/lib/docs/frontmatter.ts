export type ParsedFrontmatter = {
  frontmatter?: Record<string, unknown>;
  content: string;
};

function parseScalar(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;

  const quoted =
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  if (quoted) return trimmed.slice(1, -1);

  return trimmed;
}

function parseInlineArray(raw: string): unknown[] | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;
  const inner = trimmed.slice(1, -1).trim();
  if (inner.length === 0) return [];
  return inner
    .split(",")
    .map((part) => parseScalar(part))
    .filter((v) => v !== "");
}

export function parseFrontmatterBlock(block: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  const lines = block.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.startsWith("#")) continue;

    const idx = trimmed.indexOf(":");
    if (idx <= 0) continue;

    const key = trimmed.slice(0, idx).trim();
    if (key.length === 0) continue;

    const rawValue = trimmed.slice(idx + 1).trim();
    const inlineArray = parseInlineArray(rawValue);
    out[key] = inlineArray ?? parseScalar(rawValue);
  }

  return out;
}

export function parseMarkdownFrontmatter(markdown: string): ParsedFrontmatter {
  const trimmedStart = markdown.replace(/^\uFEFF/, ""); // strip BOM if present
  if (!trimmedStart.startsWith("---\n") && !trimmedStart.startsWith("---\r\n")) {
    return { content: markdown };
  }

  const lines = trimmedStart.split(/\r?\n/);
  if ((lines[0] ?? "").trim() !== "---") return { content: markdown };

  const endIndex = lines.slice(1).findIndex((l) => l.trim() === "---");
  if (endIndex === -1) return { content: markdown };

  const fmLines = lines.slice(1, endIndex + 1);
  const restLines = lines.slice(endIndex + 2);
  const frontmatter = parseFrontmatterBlock(fmLines.join("\n"));
  const content = restLines.join("\n").replace(/^\n+/, "");

  return { frontmatter, content };
}

