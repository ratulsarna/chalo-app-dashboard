export type AnalyticsFlowSlug = string;
export type AnalyticsEventName = string;
export type AnalyticsPropertyKey = string;

export type AnalyticsPropertyDefinition = {
  type: string;
  description?: string;
  values?: string[];
};

export type AnalyticsEventPropertyRef = {
  property: AnalyticsPropertyKey;
  context?: string;
};

export type AnalyticsEventDefinition = {
  name: AnalyticsEventName;
  component?: string;
  stage?: string;
  source?: string;
  description?: string;
  properties?: AnalyticsEventPropertyRef[];
  note?: string;
};

export type AnalyticsFlowEventsFile = {
  flowId: string;
  flowName: string;
  description?: string;
  propertyDefinitions?: Record<AnalyticsPropertyKey, AnalyticsPropertyDefinition>;
  stages?: unknown;
  events: AnalyticsEventDefinition[];
  diagram?: unknown;
};

export type AnalyticsFlow = {
  slug: AnalyticsFlowSlug;
  flowId: string;
  flowName: string;
  description?: string;
  propertyDefinitions: Record<AnalyticsPropertyKey, AnalyticsPropertyDefinition>;
  events: AnalyticsEventDefinition[];
  diagramMarkdown?: string;
  diagramSummary?: unknown;
};

export type AnalyticsEventOccurrence = {
  id: string;
  flowSlug: AnalyticsFlowSlug;
  flowId: string;
  flowName: string;
  eventName: AnalyticsEventName;
  stage?: string;
  component?: string;
  source?: string;
  description?: string;
  propertiesUsed?: AnalyticsEventPropertyRef[];
  note?: string;
};

export type AnalyticsSnapshot = {
  flows: AnalyticsFlow[];
  occurrences: AnalyticsEventOccurrence[];
  occurrencesByEventName: Record<AnalyticsEventName, AnalyticsEventOccurrence[]>;
};

