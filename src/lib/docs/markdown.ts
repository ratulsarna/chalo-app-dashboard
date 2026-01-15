export function stripLeadingMarkdownH1(markdown: string): { title?: string; body: string } {
  // Remove a leading "# Title" line to avoid duplicated page headers.
  const lines = markdown.split(/\r?\n/);
  const first = lines[0] ?? "";
  const match = /^#\s+(.+?)\s*$/.exec(first);
  if (!match) return { body: markdown };

  const title = match[1]?.trim();
  const rest = lines.slice(1).join("\n").replace(/^\n+/, "");
  return { title: title && title.length ? title : undefined, body: rest };
}

