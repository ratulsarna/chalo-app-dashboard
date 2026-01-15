export type DocsTocItem = {
  id: string;
  text: string;
  level: number; // 2..4
};

function stripMarkdownInline(text: string) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .trim();
}

export function slugifyHeading(text: string) {
  const base = stripMarkdownInline(text)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return base.length ? base : "section";
}

export function extractMarkdownToc(markdown: string): DocsTocItem[] {
  const lines = markdown.split(/\r?\n/);
  const items: DocsTocItem[] = [];
  const slugCounts = new Map<string, number>();

  let inFence = false;
  for (const line of lines) {
    const fence = line.trim().startsWith("```");
    if (fence) inFence = !inFence;
    if (inFence) continue;

    const match = /^(#{2,4})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    const hashes = match[1] ?? "";
    const rawText = match[2] ?? "";
    const level = hashes.length;
    const base = slugifyHeading(rawText);
    const next = (slugCounts.get(base) ?? 0) + 1;
    slugCounts.set(base, next);
    const id = next === 1 ? base : `${base}-${next}`;

    items.push({ id, text: stripMarkdownInline(rawText), level });
  }

  return items;
}

