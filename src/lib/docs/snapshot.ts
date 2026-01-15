import type { DocsCatalogFile, DocsFeatureMeta, DocsOverviewMeta, DocsSlugMapFile, DocsSnapshot } from "@/lib/docs/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toStatus(value: unknown): DocsFeatureMeta["status"] {
  return value === "draft" || value === "reviewed" || value === "stale" || value === "pending"
    ? value
    : "pending";
}

function toPlatforms(value: unknown): DocsFeatureMeta["platforms"] {
  if (!Array.isArray(value)) return ["shared"];
  const out: DocsFeatureMeta["platforms"] = [];
  for (const v of value) {
    if (v === "android" || v === "ios" || v === "shared") out.push(v);
  }
  return out.length ? out : ["shared"];
}

export type DocsNormalizedCatalog = {
  features: Record<string, DocsFeatureMeta>;
  overviews: Record<string, DocsOverviewMeta>;
  featureFolderByKey: Record<string, string>;
};

export function normalizeDocsCatalog(
  catalogFile: DocsCatalogFile,
  slugMapFile?: DocsSlugMapFile,
): DocsNormalizedCatalog {
  const featureFolderByKey: Record<string, string> = {};

  // slug map is folderSlug -> featureKey, but we need featureKey -> folderSlug
  if (slugMapFile && isRecord(slugMapFile)) {
    for (const [folderSlug, featureKey] of Object.entries(slugMapFile)) {
      if (folderSlug.startsWith("_")) continue;
      if (typeof featureKey !== "string") continue;
      const key = featureKey.trim();
      if (!key.length) continue;
      if (featureFolderByKey[key] === undefined) {
        featureFolderByKey[key] = folderSlug;
      }
    }
  }

  const features: Record<string, DocsFeatureMeta> = {};
  for (const [slug, raw] of Object.entries(catalogFile.features ?? {})) {
    if (slug.startsWith("_")) continue;
    if (!isRecord(raw)) continue;

    const name = toNonEmptyString(raw.name) ?? slug;
    const description = toNonEmptyString(raw.description) ?? "";
    const platforms = toPlatforms(raw.platforms);
    const hasAnalyticsFlow = Boolean(raw.hasAnalyticsFlow);
    const analyticsFlowSlug = toNonEmptyString(raw.analyticsFlowSlug) ?? undefined;
    const status = toStatus(raw.status);
    const lastUpdated = toNonEmptyString(raw.lastUpdated) ?? undefined;
    const sourceCommit = toNonEmptyString(raw.sourceCommit) ?? undefined;

    const folderSlug = featureFolderByKey[slug] ?? slug;
    featureFolderByKey[slug] = folderSlug;

    features[slug] = {
      slug,
      name,
      description,
      platforms,
      hasAnalyticsFlow,
      analyticsFlowSlug,
      status,
      lastUpdated,
      sourceCommit,
    };
  }

  const overviews: Record<string, DocsOverviewMeta> = {};
  for (const [slug, raw] of Object.entries(catalogFile.overview ?? {})) {
    if (slug.startsWith("_")) continue;
    if (!isRecord(raw)) continue;
    const name = toNonEmptyString(raw.name) ?? slug;
    const description = toNonEmptyString(raw.description) ?? "";
    const status = toStatus(raw.status);
    overviews[slug] = { slug, name, description, status };
  }

  return { features, overviews, featureFolderByKey };
}

export function buildDocsSnapshotFromCatalog(normalized: DocsNormalizedCatalog): DocsSnapshot {
  const featureList = Object.values(normalized.features).sort((a, b) => a.name.localeCompare(b.name));
  const overviewList = Object.values(normalized.overviews).sort((a, b) => a.name.localeCompare(b.name));

  return {
    features: featureList,
    overviews: overviewList,
    featuresBySlug: normalized.features,
    overviewsBySlug: normalized.overviews,
  };
}

