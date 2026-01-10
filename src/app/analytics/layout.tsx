import { getAnalyticsSnapshot } from "@/lib/analytics";
import { AnalyticsShell, type AnalyticsNavFlow } from "@/components/analytics/analytics-shell";

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const snapshot = await getAnalyticsSnapshot();

  const flows: AnalyticsNavFlow[] = snapshot.flows.map((flow) => ({
    slug: flow.slug,
    name: flow.flowName,
    description: flow.catalog?.description ?? flow.description ?? null,
    lastAudited: flow.catalog?.lastAudited ?? null,
    eventCount: flow.events.length,
  }));

  return <AnalyticsShell flows={flows}>{children}</AnalyticsShell>;
}

