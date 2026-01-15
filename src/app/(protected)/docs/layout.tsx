import { getDocsSnapshot } from "@/lib/docs";
import { DocsShell, type DocsNavFeature, type DocsNavOverview } from "@/components/docs/docs-shell";

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const snapshot = await getDocsSnapshot();

  const overviews: DocsNavOverview[] = snapshot.overviews.map((o) => ({
    slug: o.slug,
    name: o.name,
    description: o.description,
    status: o.status,
  }));

  const features: DocsNavFeature[] = snapshot.features.map((f) => ({
    slug: f.slug,
    name: f.name,
    description: f.description,
    status: f.status,
  }));

  return <DocsShell overviews={overviews} features={features}>{children}</DocsShell>;
}

