import { getAnalyticsSnapshot } from "@/lib/analytics";
import { FlowsGrid, type FlowCard } from "@/components/analytics/flows-grid";

export default async function AnalyticsFlowsPage() {
  const snapshot = await getAnalyticsSnapshot();

  const flows: FlowCard[] = snapshot.flows.map((flow) => ({
    slug: flow.slug,
    name: flow.flowName,
    flowId: flow.flowId,
    description: flow.catalog?.description ?? flow.description ?? null,
    lastAudited: flow.catalog?.lastAudited ?? null,
    eventCount: flow.events.length,
  }));

  return <FlowsGrid flows={flows} />;
}
