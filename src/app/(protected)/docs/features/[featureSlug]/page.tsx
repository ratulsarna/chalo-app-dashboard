import { notFound } from "next/navigation";
import { extractMarkdownToc, getDocsSnapshot, readFeature, stripLeadingMarkdownH1 } from "@/lib/docs";
import { FeatureDocsTabs, type TabData } from "@/components/docs/feature-docs-tabs";

const TAB_ORDER = ["hld", "components", "usecases", "repositories", "components-android", "components-ios"];

const TAB_LABELS: Record<string, string> = {
  hld: "HLD",
  components: "Components",
  usecases: "Use Cases",
  repositories: "Repositories",
  "components-android": "Components (Android)",
  "components-ios": "Components (iOS)",
};

export default async function FeatureDocsIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ featureSlug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { featureSlug } = await params;
  const { tab } = await searchParams;

  const snapshot = await getDocsSnapshot();
  const meta = snapshot.featuresBySlug[featureSlug];
  if (!meta) notFound();

  const feature = await readFeature(featureSlug);

  // Build tabs array
  const tabs: TabData[] = TAB_ORDER.map((key) => {
    let content = "";
    let exists = false;

    if (key === "hld") {
      exists = !!feature.hld;
      content = feature.hld?.content ?? "";
    } else {
      const lldKey = key as keyof typeof feature.llds;
      const lld = feature.llds[lldKey];
      exists = lld?.exists ?? false;
      content = lld?.content ?? "";
    }

    // Strip leading H1 and extract TOC
    const stripped = stripLeadingMarkdownH1(content);
    const toc = extractMarkdownToc(stripped.body);

    return {
      key,
      label: TAB_LABELS[key] ?? key,
      content: stripped.body,
      exists,
      toc,
    };
  });

  // Default to first existing tab, or "hld" if none exist
  const firstExisting = tabs.find((t) => t.exists);
  const defaultTab = tab && tabs.some((t) => t.key === tab) ? tab : (firstExisting?.key ?? "hld");

  return <FeatureDocsTabs meta={meta} tabs={tabs} defaultTab={defaultTab} />;
}
