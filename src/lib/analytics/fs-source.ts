import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type {
  AnalyticsEventOccurrence,
  AnalyticsFlow,
  AnalyticsFlowEventsFile,
  AnalyticsFlowSlug,
  AnalyticsSnapshot,
} from "@/lib/analytics/types";

const ANALYTICS_ROOT = path.join(process.cwd(), "content", "analytics");

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

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid ${label}: expected non-empty string`);
  }
}

function toOccurrenceId(
  flowSlug: AnalyticsFlowSlug,
  eventName: string,
  stage?: string,
  component?: string,
) {
  return [flowSlug, eventName, stage ?? "", component ?? ""].join("::");
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
  const eventsPath = path.join(ANALYTICS_ROOT, flowSlug, "events.json");
  const diagramsPath = path.join(ANALYTICS_ROOT, flowSlug, "flow-diagrams.md");

  const file = await readJsonFile<AnalyticsFlowEventsFile>(eventsPath);
  if (!isRecord(file)) throw new Error(`Invalid events.json for flow ${flowSlug}`);

  assertNonEmptyString(file.flowId, `flowId in ${flowSlug}/events.json`);
  assertNonEmptyString(file.flowName, `flowName in ${flowSlug}/events.json`);
  if (!Array.isArray(file.events)) throw new Error(`Invalid events[] in ${flowSlug}/events.json`);

  const diagramMarkdown = (await pathExists(diagramsPath))
    ? await fs.readFile(diagramsPath, "utf8")
    : undefined;

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

      const occurrence: AnalyticsEventOccurrence = {
        id: toOccurrenceId(flow.slug, event.name, event.stage, event.component),
        flowSlug: flow.slug,
        flowId: flow.flowId,
        flowName: flow.flowName,
        eventName: event.name,
        stage: event.stage,
        component: event.component,
        source: event.source,
        description: event.description,
        propertiesUsed: event.properties,
        note: event.note,
      };

      occurrences.push(occurrence);
      (occurrencesByEventName[event.name] ??= []).push(occurrence);
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
