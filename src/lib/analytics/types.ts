export type AnalyticsFlowSlug = string;
export type AnalyticsEventName = string;
export type AnalyticsPropertyKey = string;

export type AnalyticsStage = {
  name: string;
  description?: string;
  events?: string[];
};

export type AnalyticsDiagramSequenceStep = {
  label: string;
  events?: string[];
  next?: string;
};

export type AnalyticsDiagramFlowchartBranch = {
  label: string;
  events?: string[];
  next?: string;
};

export type AnalyticsDiagramFlowchartStep = {
  label: string;
  events?: string[];
  branches?: AnalyticsDiagramFlowchartBranch[];
  next?: string;
};

export type AnalyticsDiagram =
  | { type: "sequence"; steps: AnalyticsDiagramSequenceStep[]; notes?: string }
  | { type: "flowchart"; steps: AnalyticsDiagramFlowchartStep[]; notes?: string }
  // Forward compatibility for future diagram types not yet modeled here.
  | Record<string, unknown>;

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
  stages?: AnalyticsStage[];
  events: AnalyticsEventDefinition[];
  diagram?: AnalyticsDiagram;
};

export type AnalyticsFlow = {
  slug: AnalyticsFlowSlug;
  flowId: string;
  flowName: string;
  description?: string;
  propertyDefinitions: Record<AnalyticsPropertyKey, AnalyticsPropertyDefinition>;
  stages?: AnalyticsStage[];
  events: AnalyticsEventDefinition[];
  diagramMarkdown?: string;
  diagramSummary?: AnalyticsDiagram;
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
