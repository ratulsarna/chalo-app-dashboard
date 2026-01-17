import { notFound, redirect } from "next/navigation";
import { getDocsSnapshot } from "@/lib/docs";

const VALID_DOC_KEYS = new Set([
  "hld",
  "components",
  "components-android",
  "components-ios",
  "usecases",
  "repositories",
]);

export default async function FeatureDocRedirectPage({
  params,
}: {
  params: Promise<{ featureSlug: string; docKey: string }>;
}) {
  const { featureSlug, docKey } = await params;

  // Validate feature exists
  const snapshot = await getDocsSnapshot();
  const meta = snapshot.featuresBySlug[featureSlug];
  if (!meta) notFound();

  // Validate docKey is valid
  if (!VALID_DOC_KEYS.has(docKey)) notFound();

  // Redirect to tabbed view
  redirect(`/docs/features/${encodeURIComponent(featureSlug)}?tab=${encodeURIComponent(docKey)}`);
}
