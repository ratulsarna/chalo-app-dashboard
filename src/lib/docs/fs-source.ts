import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type { DocsCatalogFile, DocsFeature, DocsFeatureMeta, DocsOverview, DocsSlugMapFile, DocsSnapshot } from "@/lib/docs/types";
import { parseMarkdownFrontmatter } from "@/lib/docs/frontmatter";
import { assertSafeDocsSlug, toMarkdownFilename } from "@/lib/docs/paths";
import { buildDocsSnapshotFromCatalog, normalizeDocsCatalog } from "@/lib/docs/snapshot";

const DOCS_ROOT = path.join(process.cwd(), "content", "docs");
const FEATURES_ROOT = path.join(DOCS_ROOT, "features");
const FEATURES_ROOT_RESOLVED = path.resolve(FEATURES_ROOT);
const OVERVIEW_ROOT = path.join(DOCS_ROOT, "overview");
const OVERVIEW_ROOT_RESOLVED = path.resolve(OVERVIEW_ROOT);

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function resolveUnderRoot(rootResolved: string, root: string, ...segments: string[]) {
  const resolved = path.resolve(root, ...segments);
  if (resolved === rootResolved) {
    throw new Error("Invalid docs path resolution");
  }
  if (!resolved.startsWith(`${rootResolved}${path.sep}`)) {
    throw new Error("Resolved path escapes docs root");
  }
  return resolved;
}

const readDocsMeta = cache(async () => {
  const catalogPath = path.join(DOCS_ROOT, "catalog.json");
  const slugMapPath = path.join(DOCS_ROOT, "feature-slug-map.json");

  const catalog = await readJsonFile<DocsCatalogFile>(catalogPath);
  const slugMap = (await pathExists(slugMapPath))
    ? await readJsonFile<DocsSlugMapFile>(slugMapPath)
    : undefined;

  const normalized = normalizeDocsCatalog(catalog, slugMap);
  const snapshot = buildDocsSnapshotFromCatalog(normalized);

  return { snapshot, normalized };
});

export const getDocsSnapshot = cache(async (): Promise<DocsSnapshot> => {
  const { snapshot } = await readDocsMeta();
  return snapshot;
});

export const readOverviewDoc = cache(async (overviewSlug: string): Promise<DocsOverview> => {
  assertSafeDocsSlug(overviewSlug, "overviewSlug");

  const snapshot = await getDocsSnapshot();
  const meta = snapshot.overviewsBySlug[overviewSlug];
  if (!meta) {
    throw new Error(`Unknown overviewSlug: ${overviewSlug}`);
  }

  const filePath = resolveUnderRoot(OVERVIEW_ROOT_RESOLVED, OVERVIEW_ROOT, `${overviewSlug}.md`);
  if (!(await pathExists(filePath))) {
    return { ...meta, content: "", frontmatter: undefined };
  }

  const raw = await fs.readFile(filePath, "utf8");
  const parsed = parseMarkdownFrontmatter(raw);
  return { ...meta, content: parsed.content, frontmatter: parsed.frontmatter };
});

export const readFeatureDoc = cache(
  async (
    featureSlug: string,
    docKey: string,
  ): Promise<{ content: string; frontmatter?: Record<string, unknown>; exists: boolean; filePath: string }> => {
    assertSafeDocsSlug(featureSlug, "featureSlug");
    assertSafeDocsSlug(docKey, "docKey");

    const { normalized } = await readDocsMeta();
    const folderSlug = normalized.featureFolderByKey[featureSlug];
    if (!folderSlug) {
      throw new Error(`Unknown featureSlug: ${featureSlug}`);
    }

    const fileName = toMarkdownFilename(docKey);
    const filePath = resolveUnderRoot(
      FEATURES_ROOT_RESOLVED,
      FEATURES_ROOT,
      folderSlug,
      fileName,
    );

    if (!(await pathExists(filePath))) {
      return { content: "", exists: false, filePath };
    }

    const raw = await fs.readFile(filePath, "utf8");
    const parsed = parseMarkdownFrontmatter(raw);
    return { content: parsed.content, frontmatter: parsed.frontmatter, exists: true, filePath };
  },
);

export const listFeatureDocKeys = cache(async (featureSlug: string): Promise<string[]> => {
  assertSafeDocsSlug(featureSlug, "featureSlug");
  const { normalized } = await readDocsMeta();
  const folderSlug = normalized.featureFolderByKey[featureSlug];
  if (!folderSlug) {
    throw new Error(`Unknown featureSlug: ${featureSlug}`);
  }

  const dirPath = resolveUnderRoot(FEATURES_ROOT_RESOLVED, FEATURES_ROOT, folderSlug);
  if (!(await pathExists(dirPath))) return [];

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".md"))
    .map((e) => e.name.slice(0, -3))
    .sort((a, b) => a.localeCompare(b));
});

export const readFeature = cache(async (featureSlug: string): Promise<DocsFeature> => {
  const snapshot = await getDocsSnapshot();
  const meta = snapshot.featuresBySlug[featureSlug];
  if (!meta) {
    throw new Error(`Unknown featureSlug: ${featureSlug}`);
  }

  const hld = await readFeatureDoc(featureSlug, "hld");
  const knownLlds = ["components", "components-android", "components-ios", "usecases", "repositories"] as const;
  const llds: DocsFeature["llds"] = {
    components: { type: "components", content: "", exists: false },
    "components-android": { type: "components-android", content: "", exists: false },
    "components-ios": { type: "components-ios", content: "", exists: false },
    usecases: { type: "usecases", content: "", exists: false },
    repositories: { type: "repositories", content: "", exists: false },
  };

  for (const key of knownLlds) {
    const doc = await readFeatureDoc(featureSlug, key);
    llds[key] = { type: key, content: doc.content, frontmatter: doc.frontmatter, exists: doc.exists };
  }

  return {
    ...(meta as DocsFeatureMeta),
    hld: hld.exists ? { content: hld.content, frontmatter: hld.frontmatter } : undefined,
    llds,
  };
});
