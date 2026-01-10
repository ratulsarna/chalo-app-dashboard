import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type {
  AnalyticsEventOccurrence,
  AnalyticsEventPropertyRef,
  AnalyticsFlow,
  AnalyticsFlowEventsFile,
  AnalyticsFlowSlug,
  AnalyticsSnapshot,
} from "@/lib/analytics/types";

const ANALYTICS_ROOT = path.join(process.cwd(), "content", "analytics");
const ANALYTICS_ROOT_RESOLVED = path.resolve(ANALYTICS_ROOT);
const FLOW_SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;

type AnalyticsFlowCatalogFile = {
  flows?: Record<
    string,
    {
      name?: string;
      description?: string;
      lastAudited?: string;
    }
  >;
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toTrimmedNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid ${label}: expected non-empty string`);
  }
}

function assertSafeFlowSlug(flowSlug: string): void {
  // `flowSlug` may come from user-controlled input in future usages.
  // Enforce a conservative character set and block path traversal.
  if (!FLOW_SLUG_PATTERN.test(flowSlug)) {
    throw new Error(`Invalid flowSlug: ${flowSlug}`);
  }
}

function resolveUnderAnalyticsRoot(...segments: string[]) {
  const resolved = path.resolve(ANALYTICS_ROOT, ...segments);
  if (resolved === ANALYTICS_ROOT_RESOLVED) {
    throw new Error("Invalid analytics path resolution");
  }
  if (!resolved.startsWith(`${ANALYTICS_ROOT_RESOLVED}${path.sep}`)) {
    throw new Error("Resolved path escapes analytics root");
  }
  return resolved;
}

const readFlowSlugMap = cache(async () => {
  const mapPath = path.join(ANALYTICS_ROOT, "flow-slug-map.json");
  if (!(await pathExists(mapPath))) return {} as Record<string, string>;
  const raw = await readJsonFile<Record<string, unknown>>(mapPath);
  if (!isRecord(raw)) return {} as Record<string, string>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith("_")) continue;
    if (typeof v === "string" && v.trim().length > 0) out[k] = v;
  }
  return out;
});

const readFlowsCatalog = cache(async () => {
  const catalogPath = path.join(ANALYTICS_ROOT, "flows.json");
  if (!(await pathExists(catalogPath))) return undefined;
  const raw = await readJsonFile<AnalyticsFlowCatalogFile>(catalogPath);
  if (!isRecord(raw) || !isRecord(raw.flows)) return undefined;
  return raw as AnalyticsFlowCatalogFile;
});

function normalizePropertiesUsed(raw: unknown): AnalyticsEventPropertyRef[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  const out: AnalyticsEventPropertyRef[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const property = toTrimmedNonEmptyString(item);
      if (property) out.push({ property });
      continue;
    }

    if (!isRecord(item)) continue;

    const property =
      toTrimmedNonEmptyString(item.property) ?? toTrimmedNonEmptyString(item.name);
    if (!property) continue;

    const contextParts: string[] = [];
    if (typeof item.required === "boolean" && item.required) contextParts.push("Required.");
    const description = toTrimmedNonEmptyString(item.description);
    if (description) contextParts.push(description);

    const context = contextParts.length ? contextParts.join(" ") : undefined;
    out.push({ property, context });
  }

  return out.length ? out : undefined;
}

function toOccurrenceId(
  flowSlug: AnalyticsFlowSlug,
  eventName: string,
  eventIndex: number,
  stage?: string,
  component?: string,
) {
  // Encode segments to avoid collisions if values contain the separator.
  // Include eventIndex to ensure uniqueness when the same event appears multiple times
  // within the same flow with identical stage/component metadata.
  return [flowSlug, String(eventIndex), eventName, stage ?? "", component ?? ""]
    .map((value) => encodeURIComponent(value))
    .join("::");
}

/**
 * Lists flow slugs under `content/analytics/` that contain an `events.json`.
 */
export const listAnalyticsFlowSlugs = cache(async (): Promise<AnalyticsFlowSlug[]> => {
  const entries = await fs.readdir(ANALYTICS_ROOT, { withFileTypes: true });
  const slugs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const usable: AnalyticsFlowSlug[] = [];
  for (const slug of slugs) {
    const eventsPath = path.join(ANALYTICS_ROOT, slug, "events.json");
    if (await pathExists(eventsPath)) usable.push(slug);
  }
  return usable;
});

/**
 * Reads a flow from disk (events + optional diagram markdown).
 */
export const readAnalyticsFlow = cache(async (flowSlug: AnalyticsFlowSlug): Promise<AnalyticsFlow> => {
  assertSafeFlowSlug(flowSlug);

  const eventsPath = path.join(ANALYTICS_ROOT, flowSlug, "events.json");
  const diagramsPath = path.join(ANALYTICS_ROOT, flowSlug, "flow-diagrams.md");
  // Secondary safety: ensure the resulting paths stay under `content/analytics`.
  resolveUnderAnalyticsRoot(flowSlug, "events.json");
  resolveUnderAnalyticsRoot(flowSlug, "flow-diagrams.md");

  const file = await readJsonFile<AnalyticsFlowEventsFile>(eventsPath);
  if (!isRecord(file)) throw new Error(`Invalid events.json for flow ${flowSlug}`);

  assertNonEmptyString(file.flowId, `flowId in ${flowSlug}/events.json`);
  assertNonEmptyString(file.flowName, `flowName in ${flowSlug}/events.json`);
  if (!Array.isArray(file.events)) throw new Error(`Invalid events[] in ${flowSlug}/events.json`);

  const diagramMarkdown = (await pathExists(diagramsPath))
    ? await fs.readFile(diagramsPath, "utf8")
    : undefined;

  const [slugMap, catalog] = await Promise.all([readFlowSlugMap(), readFlowsCatalog()]);
  const catalogKey = slugMap[flowSlug];
  const catalogEntry = catalogKey ? catalog?.flows?.[catalogKey] : undefined;

  return {
    slug: flowSlug,
    flowId: file.flowId,
    flowName: file.flowName,
    description: file.description,
    propertyDefinitions: file.propertyDefinitions ?? {},
    stages: file.stages,
    events: file.events,
    diagramMarkdown,
    diagramSummary: file.diagram,
    catalog: catalogKey
      ? {
          key: catalogKey,
          name: catalogEntry?.name,
          description: catalogEntry?.description,
          lastAudited: catalogEntry?.lastAudited,
        }
      : undefined,
  };
});

/**
 * Builds an in-memory snapshot of all flows + per-flow event occurrences.
 *
 * This is cached via React's `cache()` to avoid repeated filesystem reads.
 */
export const getAnalyticsSnapshot = cache(async (): Promise<AnalyticsSnapshot> => {
  const slugs = await listAnalyticsFlowSlugs();
  const flows = await Promise.all(slugs.map((slug) => readAnalyticsFlow(slug)));

  const occurrences: AnalyticsEventOccurrence[] = [];
  const occurrencesByEventName: Record<string, AnalyticsEventOccurrence[]> = {};
  let skipped = 0;
  const skippedSamples: string[] = [];

  for (const flow of flows) {
    for (const [index, event] of flow.events.entries()) {
      if (!event || typeof event !== "object") {
        skipped += 1;
        if (skippedSamples.length < 10) {
          skippedSamples.push(`flow=${flow.slug} index=${index} reason=not-object`);
        }
        continue;
      }
      if (typeof event.name !== "string" || event.name.trim().length === 0) {
        skipped += 1;
        if (skippedSamples.length < 10) {
          skippedSamples.push(`flow=${flow.slug} index=${index} reason=invalid-name`);
        }
        continue;
      }

      const stage =
        toTrimmedNonEmptyString(event.stage) ?? toTrimmedNonEmptyString(event.funnelPosition);
      const component =
        toTrimmedNonEmptyString(event.component) ?? toTrimmedNonEmptyString(event.firingLocation);

      const occurrence: AnalyticsEventOccurrence = {
        id: toOccurrenceId(flow.slug, event.name, index, stage, component),
        flowSlug: flow.slug,
        flowId: flow.flowId,
        flowName: flow.flowName,
        eventName: event.name,
        stage,
        component,
        source: toTrimmedNonEmptyString(event.source),
        description: toTrimmedNonEmptyString(event.description),
        propertiesUsed: normalizePropertiesUsed(event.properties),
        note: event.note,
      };

      occurrences.push(occurrence);
      if (!occurrencesByEventName[event.name]) {
        occurrencesByEventName[event.name] = [];
      }
      occurrencesByEventName[event.name].push(occurrence);
    }
  }

  if (process.env.NODE_ENV !== "production" && skipped > 0) {
    const suffix = skippedSamples.length > 0 ? ` (samples: ${skippedSamples.join(", ")})` : "";
    console.warn(`[analytics] Skipped ${skipped} invalid event entries while building snapshot${suffix}`);
  }

  return {
    flows: flows.sort((a, b) => a.flowName.localeCompare(b.flowName)),
    occurrences,
    occurrencesByEventName,
  };
});
