import type { AnalyticsEventOccurrence } from "@/lib/analytics/types";

/**
 * Encodes an event name for safe usage in URL path segments.
 */
export function encodeEventNameForPath(eventName: string) {
  return encodeURIComponent(eventName);
}

/**
 * Decodes an event name from a URL path segment.
 *
 * If decoding fails, returns the original string.
 */
export function decodeEventNameFromPath(eventParam: string) {
  try {
    return decodeURIComponent(eventParam);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[analytics] Failed to decode event parameter:", eventParam, err);
    }
    return eventParam;
  }
}

/**
 * Produces a stable DOM id for deep-linking to an event occurrence in tables.
 */
export function occurrenceAnchorId(occurrence: AnalyticsEventOccurrence) {
  return `ev-${encodeURIComponent(occurrence.id)}`;
}
