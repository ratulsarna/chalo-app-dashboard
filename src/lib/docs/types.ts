/** Kebab-case folder name under content/docs/features/ */
export type DocsFeatureSlug = string;

/** Overview document identifier (e.g., "project-structure", "tech-stack") */
export type DocsOverviewSlug = string;

/** Documentation status for tracking review state */
export type DocsStatus = "pending" | "draft" | "reviewed" | "stale";

/** Platform identifiers for cross-platform documentation */
export type DocsPlatform = "android" | "ios" | "shared";

/** Issue severity levels for documentation validation */
export type DocsIssueLevel = "error" | "warning";

/** Validation issue found in documentation */
export type DocsIssue = {
  level: DocsIssueLevel;
  code: string;
  message: string;
  featureSlug?: DocsFeatureSlug;
  filePath?: string;
};

/**
 * YAML frontmatter schema for HLD/LLD markdown files.
 * Parsed from the top of each markdown document.
 */
export type DocsFrontmatter = {
  // Shared keys found across docs
  feature?: DocsFeatureSlug;
  slug?: string; // e.g. overview docs sometimes declare their own slug
  layer?: string; // e.g. "presentation" in LLD docs
  lastUpdated?: string; // ISO date string
  sourceCommit?: string; // Git SHA
  platforms?: DocsPlatform[];
  hasAnalyticsFlow?: boolean;
  analyticsFlowSlug?: string;
};

/**
 * Overview document metadata from catalog.json
 */
export type DocsOverviewMeta = {
  slug: DocsOverviewSlug;
  name: string;
  description: string;
  status: DocsStatus;
};

/**
 * Overview document with content loaded
 */
export type DocsOverview = DocsOverviewMeta & {
  content: string; // Raw markdown
  frontmatter?: DocsFrontmatter;
};

/**
 * Feature metadata from catalog.json
 */
export type DocsFeatureMeta = {
  slug: DocsFeatureSlug;
  name: string;
  description: string;
  platforms: DocsPlatform[];
  hasAnalyticsFlow: boolean;
  analyticsFlowSlug?: string;
  status: DocsStatus;
  lastUpdated?: string;
  sourceCommit?: string;
};

/**
 * LLD document types
 */
export type DocsLLDType =
  | "components"
  | "components-android"
  | "components-ios"
  | "usecases"
  | "repositories";

/**
 * Individual LLD document
 */
export type DocsLLD = {
  type: DocsLLDType;
  content: string; // Raw markdown
  frontmatter?: DocsFrontmatter;
  exists: boolean;
};

/**
 * Complete feature documentation with HLD and all LLDs loaded
 */
export type DocsFeature = DocsFeatureMeta & {
  hld?: {
    content: string;
    frontmatter?: DocsFrontmatter;
  };
  llds: Record<DocsLLDType, DocsLLD>;
  issues?: DocsIssue[];
};

/**
 * Catalog file schema (content/docs/catalog.json)
 */
export type DocsCatalogFile = {
  _comment?: string;
  _version: string;
  features: Record<
    string,
    {
      name: string;
      description: string;
      platforms: DocsPlatform[];
      hasAnalyticsFlow: boolean;
      analyticsFlowSlug?: string;
      status: DocsStatus;
      lastUpdated?: string | null;
      sourceCommit?: string | null;
    }
  >;
  overview: Record<
    string,
    {
      name: string;
      description: string;
      status: DocsStatus;
    }
  >;
};

/**
 * Slug map file schema (content/docs/feature-slug-map.json)
 */
export type DocsSlugMapFile = Record<string, string>;

/**
 * Search hit for documentation search results
 */
export type DocsSearchHit = {
  type: "feature" | "overview";
  slug: DocsFeatureSlug | DocsOverviewSlug;
  name: string;
  description: string;
  matchedIn: ("name" | "description" | "content")[];
  snippet?: string;
};

/**
 * Complete documentation snapshot for UI rendering.
 * Built by the filesystem adapter, cached per request.
 */
export type DocsSnapshot = {
  features: DocsFeatureMeta[];
  overviews: DocsOverviewMeta[];
  featuresBySlug: Record<DocsFeatureSlug, DocsFeatureMeta>;
  overviewsBySlug: Record<DocsOverviewSlug, DocsOverviewMeta>;
  issues?: DocsIssue[];
};
