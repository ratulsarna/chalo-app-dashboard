import type { AnalyticsEventOccurrence } from "@/lib/analytics/types";

export function encodeEventNameForPath(eventName: string) {
  return encodeURIComponent(eventName);
}

export function decodeEventNameFromPath(eventParam: string) {
  try {
    return decodeURIComponent(eventParam);
  } catch {
    return eventParam;
  }
}

export function occurrenceAnchorId(occurrence: AnalyticsEventOccurrence) {
  return `ev-${encodeURIComponent(occurrence.id)}`;
}

