import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type {
  AnalyticsDocIssue,
  AnalyticsEventOccurrence,
  AnalyticsEventPropertyRef,
  AnalyticsFlow,
  AnalyticsFlowEventsFile,
  AnalyticsFlowSlug,
  AnalyticsSnapshot,
  DiagramReference,
} from "@/lib/analytics/types";
import { extractMermaidBlocks } from "@/lib/analytics/diagram-markdown";
import { extractNodeLabelsFromMermaid } from "@/lib/analytics/diagram-links";

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

type AnalyticsDocsMeta = {
  slugMap: Record<string, string>;
  catalog?: AnalyticsFlowCatalogFile;
  issues: AnalyticsDocIssue[];
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

function formatUnknownError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
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

const readAnalyticsDocsMeta = cache(async (): Promise<AnalyticsDocsMeta> => {
  const issues: AnalyticsDocIssue[] = [];

  const mapPath = path.join(ANALYTICS_ROOT, "flow-slug-map.json");
  const out: Record<string, string> = {};

  if (await pathExists(mapPath)) {
    try {
      const raw = await readJsonFile<unknown>(mapPath);
      if (!isRecord(raw)) {
        issues.push({
          level: "warning",
          code: "slug_map_invalid_shape",
          message: "flow-slug-map.json is not an object; ignoring it.",
          filePath: mapPath,
        });
      } else {
        for (const [k, v] of Object.entries(raw)) {
          if (k.startsWith("_")) continue;
          if (typeof v === "string" && v.trim().length > 0) out[k] = v.trim();
        }
      }
    } catch (err) {
      issues.push({
        level: "warning",
        code: "slug_map_parse_error",
        message: `Failed to parse flow-slug-map.json; ignoring it. (${formatUnknownError(err)})`,
        filePath: mapPath,
      });
    }
  }

  const catalogPath = path.join(ANALYTICS_ROOT, "flows.json");
  let catalog: AnalyticsFlowCatalogFile | undefined;

  if (await pathExists(catalogPath)) {
    try {
      const raw = await readJsonFile<unknown>(catalogPath);
      if (!isRecord(raw) || (raw.flows !== undefined && !isRecord(raw.flows))) {
        issues.push({
          level: "warning",
          code: "flows_catalog_invalid_shape",
          message: "flows.json has an unexpected shape; ignoring it.",
          filePath: catalogPath,
        });
      } else {
        catalog = raw as AnalyticsFlowCatalogFile;
      }
    } catch (err) {
      issues.push({
        level: "warning",
        code: "flows_catalog_parse_error",
        message: `Failed to parse flows.json; ignoring it. (${formatUnknownError(err)})`,
        filePath: catalogPath,
      });
    }
  }

  return { slugMap: out, catalog, issues };
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

    // Some flows store per-event property context as `context` (already normalized).
    // Others store richer metadata as `description` + `required`.
    const explicitContext = toTrimmedNonEmptyString(item.context);
    if (explicitContext) contextParts.push(explicitContext);

    const description = toTrimmedNonEmptyString(item.description);
    if (description && description !== explicitContext) contextParts.push(description);

    const combinedContext = contextParts.length ? contextParts.join(" ") : undefined;
    out.push({ property, context: combinedContext });
  }

  return out.length ? out : undefined;
}

function toOccurrenceId(
  flowSlug: AnalyticsFlowSlug,
  eventName: string,
  eventIndex: number,
  component?: string,
) {
  // Encode segments to avoid collisions if values contain the separator.
  // Include eventIndex to ensure uniqueness when the same event appears multiple times
  // within the same flow with identical component metadata.
  return [flowSlug, String(eventIndex), eventName, component ?? ""]
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

  const issues: AnalyticsDocIssue[] = [];

  let rawFile: unknown;
  try {
    rawFile = await readJsonFile<unknown>(eventsPath);
  } catch (err) {
    issues.push({
      level: "error",
      code: "events_json_parse_error",
      message: `Failed to parse events.json (${formatUnknownError(err)})`,
      flowSlug,
      filePath: eventsPath,
    });
    const diagramMarkdown = (await pathExists(diagramsPath)) ? await fs.readFile(diagramsPath, "utf8") : undefined;
    return {
      slug: flowSlug,
      flowId: flowSlug,
      flowName: flowSlug,
      propertyDefinitions: {},
      events: [],
      diagramMarkdown,
      issues,
    };
  }

  if (!isRecord(rawFile)) {
    issues.push({
      level: "error",
      code: "events_json_invalid_shape",
      message: "events.json must be an object at the top level.",
      flowSlug,
      filePath: eventsPath,
    });
    const diagramMarkdown = (await pathExists(diagramsPath)) ? await fs.readFile(diagramsPath, "utf8") : undefined;
    return {
      slug: flowSlug,
      flowId: flowSlug,
      flowName: flowSlug,
      propertyDefinitions: {},
      events: [],
      diagramMarkdown,
      issues,
    };
  }

  const file = rawFile as Partial<AnalyticsFlowEventsFile> & Record<string, unknown>;

  const flowId = toTrimmedNonEmptyString(file.flowId) ?? flowSlug;
  if (!toTrimmedNonEmptyString(file.flowId)) {
    issues.push({
      level: "error",
      code: "flow_id_missing",
      message: "Missing or invalid flowId; falling back to flow slug.",
      flowSlug,
      filePath: eventsPath,
    });
  }

  const flowName = toTrimmedNonEmptyString(file.flowName) ?? flowSlug;
  if (!toTrimmedNonEmptyString(file.flowName)) {
    issues.push({
      level: "error",
      code: "flow_name_missing",
      message: "Missing or invalid flowName; falling back to flow slug.",
      flowSlug,
      filePath: eventsPath,
    });
  }

  const description = toTrimmedNonEmptyString(file.description);
  if (file.description !== undefined && description === undefined) {
    issues.push({
      level: "warning",
      code: "flow_description_invalid",
      message: "Flow description is not a non-empty string; ignoring it.",
      flowSlug,
      filePath: eventsPath,
    });
  }

  const propertyDefinitions: AnalyticsFlow["propertyDefinitions"] = {};
  if (file.propertyDefinitions !== undefined && !isRecord(file.propertyDefinitions)) {
    issues.push({
      level: "warning",
      code: "property_definitions_invalid_shape",
      message: "propertyDefinitions must be an object; ignoring it.",
      flowSlug,
      filePath: eventsPath,
    });
  } else if (isRecord(file.propertyDefinitions)) {
    for (const [rawKey, rawDef] of Object.entries(file.propertyDefinitions)) {
      const key = toTrimmedNonEmptyString(rawKey);
      if (!key) continue;
      if (!isRecord(rawDef)) {
        issues.push({
          level: "warning",
          code: "property_definition_invalid_shape",
          message: `Property definition for "${key}" must be an object; ignoring it.`,
          flowSlug,
          filePath: eventsPath,
        });
        continue;
      }

      const type = toTrimmedNonEmptyString(rawDef.type) ?? "unknown";
      if (!toTrimmedNonEmptyString(rawDef.type)) {
        issues.push({
          level: "warning",
          code: "property_definition_missing_type",
          message: `Property "${key}" is missing a valid type; using "unknown".`,
          flowSlug,
          filePath: eventsPath,
        });
      }

      const defDescription = toTrimmedNonEmptyString(rawDef.description);
      const values =
        Array.isArray(rawDef.values) ? rawDef.values.map(toTrimmedNonEmptyString).filter(Boolean) : undefined;

      propertyDefinitions[key] = {
        type,
        description: defDescription,
        values: values && values.length > 0 ? (values as string[]) : undefined,
      };
    }
  }

  const normalizedEvents: AnalyticsFlowEventsFile["events"] = [];
  if (!Array.isArray(file.events)) {
    issues.push({
      level: "error",
      code: "events_invalid_shape",
      message: "events must be an array; treating this flow as having 0 events.",
      flowSlug,
      filePath: eventsPath,
    });
  } else {
    for (const [idx, rawEvent] of file.events.entries()) {
      if (!isRecord(rawEvent)) {
        issues.push({
          level: "warning",
          code: "event_invalid_shape",
          message: `Event at index ${idx} is not an object; skipping it.`,
          flowSlug,
          filePath: eventsPath,
        });
        continue;
      }

      const rawName = rawEvent.name;
      if (typeof rawName !== "string") {
        issues.push({
          level: "warning",
          code: "event_name_missing",
          message: `Event at index ${idx} is missing a string 'name'; skipping it.`,
          flowSlug,
          filePath: eventsPath,
        });
        continue;
      }

      const name = rawName.trim();
      if (name.length === 0) {
        issues.push({
          level: "warning",
          code: "event_name_empty",
          message: `Event at index ${idx} has an empty name; skipping it.`,
          flowSlug,
          filePath: eventsPath,
        });
        continue;
      }
      if (name !== rawName) {
        issues.push({
          level: "warning",
          code: "event_name_trimmed",
          message: `Event name had leading/trailing whitespace; using trimmed value (${JSON.stringify(rawName)} → ${JSON.stringify(name)}).`,
          flowSlug,
          filePath: eventsPath,
        });
      }

      const normalized = {
        name,
        component:
          toTrimmedNonEmptyString(rawEvent.component) ??
          toTrimmedNonEmptyString((rawEvent as Record<string, unknown>).firingLocation),
        source: toTrimmedNonEmptyString(rawEvent.source),
        description: toTrimmedNonEmptyString(rawEvent.description),
        properties: Array.isArray(rawEvent.properties) ? rawEvent.properties : undefined,
        note: toTrimmedNonEmptyString(rawEvent.note),
      };

      normalizedEvents.push(normalized);
    }
  }

  const diagramMarkdown = (await pathExists(diagramsPath)) ? await fs.readFile(diagramsPath, "utf8") : undefined;

  const meta = await readAnalyticsDocsMeta();
  const catalogKey = meta.slugMap[flowSlug];
  const catalogEntry = catalogKey ? meta.catalog?.flows?.[catalogKey] : undefined;

  // Note: we intentionally do not attach meta.issues to each flow (they're global). Those are
  // exposed at snapshot-level to avoid duplication.
  if (catalogKey && meta.catalog?.flows && !(catalogKey in meta.catalog.flows)) {
    issues.push({
      level: "warning",
      code: "catalog_key_missing",
      message: `flow-slug-map.json maps to "${catalogKey}" but flows.json has no matching entry.`,
      flowSlug,
      filePath: path.join(ANALYTICS_ROOT, "flows.json"),
    });
  }

  return {
    slug: flowSlug,
    flowId,
    flowName,
    description,
    propertyDefinitions,
    events: normalizedEvents,
    diagramMarkdown,
    diagramSummary: isRecord(file.diagram) ? (file.diagram as AnalyticsFlowEventsFile["diagram"]) : undefined,
    catalog: catalogKey
      ? {
          key: catalogKey,
          name: catalogEntry?.name,
          description: catalogEntry?.description,
          lastAudited: catalogEntry?.lastAudited,
        }
      : undefined,
    issues: issues.length ? issues : undefined,
  };
});

/**
 * Builds an in-memory snapshot of all flows + per-flow event occurrences.
 *
 * This is cached via React's `cache()` to avoid repeated filesystem reads.
 */
export const getAnalyticsSnapshot = cache(async (): Promise<AnalyticsSnapshot> => {
  const meta = await readAnalyticsDocsMeta();
  const slugs = await listAnalyticsFlowSlugs();
  const settled = await Promise.allSettled(slugs.map((slug) => readAnalyticsFlow(slug)));
  const flows: AnalyticsFlow[] = [];
  const issues: AnalyticsDocIssue[] = [...meta.issues];

  for (const result of settled) {
    if (result.status === "fulfilled") {
      flows.push(result.value);
      if (result.value.issues) issues.push(...result.value.issues);
      continue;
    }

    // This should be rare (e.g., slug safety checks). Keep the rest of the snapshot usable.
    issues.push({
      level: "error",
      code: "flow_read_failed",
      message: `Failed to read a flow: ${formatUnknownError(result.reason)}`,
      filePath: ANALYTICS_ROOT,
    });
  }

  const occurrences: AnalyticsEventOccurrence[] = [];
  const occurrencesByEventName: Record<string, AnalyticsEventOccurrence[]> = {};

  for (const flow of flows) {
    for (const [index, event] of flow.events.entries()) {
      if (!event || typeof event !== "object") {
        issues.push({
          level: "warning",
          code: "occurrence_event_invalid_shape",
          message: `Flow "${flow.slug}" has an invalid event at index ${index}; skipping it.`,
          flowSlug: flow.slug,
          filePath: path.join(ANALYTICS_ROOT, flow.slug, "events.json"),
        });
        continue;
      }
      if (typeof event.name !== "string" || event.name.trim().length === 0) {
        issues.push({
          level: "warning",
          code: "occurrence_event_missing_name",
          message: `Flow "${flow.slug}" has an event with invalid name at index ${index}; skipping it.`,
          flowSlug: flow.slug,
          filePath: path.join(ANALYTICS_ROOT, flow.slug, "events.json"),
        });
        continue;
      }
      const component = toTrimmedNonEmptyString(event.component);

      const occurrence: AnalyticsEventOccurrence = {
        id: toOccurrenceId(flow.slug, event.name, index, component),
        flowSlug: flow.slug,
        flowId: flow.flowId,
        flowName: flow.flowName,
        eventName: event.name,
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

  // Build diagramsByEventName: for each diagram, extract node labels and match to known event names
  const diagramsByEventName: Record<string, DiagramReference[]> = {};
  const knownEventNames = new Set(Object.keys(occurrencesByEventName));

  for (const flow of flows) {
    if (!flow.diagramMarkdown) continue;

    const blocks = extractMermaidBlocks(flow.diagramMarkdown);
    for (const block of blocks) {
      if (block.kind === "visual-key") continue;

      const labels = extractNodeLabelsFromMermaid(block.code);
      const matchedEvents = new Set<string>();

      for (const label of labels.values()) {
        if (knownEventNames.has(label) && !matchedEvents.has(label)) {
          matchedEvents.add(label);

          const ref: DiagramReference = {
            flowSlug: flow.slug,
            flowName: flow.flowName,
            diagramId: block.id,
            diagramTitle: block.title,
          };

          if (!diagramsByEventName[label]) {
            diagramsByEventName[label] = [];
          }

          // Deduplicate by (flowSlug, diagramId)
          const existing = diagramsByEventName[label].find(
            (r) => r.flowSlug === ref.flowSlug && r.diagramId === ref.diagramId
          );
          if (!existing) {
            diagramsByEventName[label].push(ref);
          }
        }
      }
    }
  }

  return {
    flows: flows.sort((a, b) => a.flowName.localeCompare(b.flowName)),
    occurrences,
    occurrencesByEventName,
    diagramsByEventName,
    issues: issues.length ? issues : undefined,
  };
});
