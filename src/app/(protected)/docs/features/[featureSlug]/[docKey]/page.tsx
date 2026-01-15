import Link from "next/link";
import { notFound } from "next/navigation";
import { extractMarkdownToc, getDocsSnapshot, listFeatureDocKeys, readFeatureDoc, stripLeadingMarkdownH1 } from "@/lib/docs";
import { DocsMarkdown } from "@/components/docs/docs-markdown";
import { DocsToc } from "@/components/docs/docs-toc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function labelForDocKey(key: string) {
  switch (key) {
    case "hld":
      return "High-level design";
    case "components":
      return "Components (LLD)";
    case "components-android":
      return "Components — Android (LLD)";
    case "components-ios":
      return "Components — iOS (LLD)";
    case "usecases":
      return "Use cases (LLD)";
    case "repositories":
      return "Repositories (LLD)";
    default:
      return key;
  }
}

export default async function FeatureDocPage({
  params,
}: {
  params: Promise<{ featureSlug: string; docKey: string }>;
}) {
  const { featureSlug, docKey } = await params;
  const snapshot = await getDocsSnapshot();
  const meta = snapshot.featuresBySlug[featureSlug];
  if (!meta) notFound();

  const doc = await readFeatureDoc(featureSlug, docKey);
  const stripped = stripLeadingMarkdownH1(doc.content);
  const title = stripped.title ?? labelForDocKey(docKey);
  const toc = extractMarkdownToc(stripped.body);
  const availableDocKeys = await listFeatureDocKeys(featureSlug);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/docs/features/${encodeURIComponent(featureSlug)}`}
              className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              {meta.name}
            </Link>
            <span className="text-sm text-muted-foreground">/</span>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <Badge variant={doc.exists ? "secondary" : "outline"}>
              {doc.exists ? "available" : "missing"}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">{meta.description}</p>

          {meta.hasAnalyticsFlow && meta.analyticsFlowSlug ? (
            <div className="pt-2">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/analytics/flows/${encodeURIComponent(meta.analyticsFlowSlug)}`}>
                  View analytics flow
                </Link>
              </Button>
            </div>
          ) : null}
        </div>

        {doc.exists && stripped.body.trim().length ? (
          <DocsMarkdown markdown={stripped.body} />
        ) : (
          <div className="space-y-4 rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
            <p>
              This page isn’t written yet. Add{" "}
              <code>{`content/docs/features/<feature>/${docKey}.md`}</code>.
            </p>
            {availableDocKeys.length ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Available pages
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableDocKeys.map((k) => (
                    <Button key={k} asChild size="sm" variant="outline">
                      <Link
                        href={`/docs/features/${encodeURIComponent(featureSlug)}/${encodeURIComponent(k)}`}
                      >
                        {labelForDocKey(k)}
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-28 space-y-6">
          <DocsToc items={toc} />
        </div>
      </aside>
    </div>
  );
}
