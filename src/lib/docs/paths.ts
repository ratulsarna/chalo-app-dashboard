const SAFE_SEGMENT = /^[a-z0-9][a-z0-9_-]*$/i;

export function assertSafeDocsSlug(value: string, label: string) {
  if (!SAFE_SEGMENT.test(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

export function toMarkdownFilename(docKey: string) {
  assertSafeDocsSlug(docKey, "docKey");
  return `${docKey}.md`;
}

