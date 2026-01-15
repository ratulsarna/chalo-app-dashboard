import Link from "next/link";
import { notFound } from "next/navigation";
import { getDocsSnapshot, listFeatureDocKeys } from "@/lib/docs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function statusVariant(status: string): React.ComponentProps<typeof Badge>["variant"] {
  switch (status) {
    case "reviewed":
      return "default";
    case "draft":
      return "secondary";
    case "stale":
      return "destructive";
    case "pending":
    default:
      return "outline";
  }
}

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

export default async function FeatureDocsIndexPage({ params }: { params: Promise<{ featureSlug: string }> }) {
  const { featureSlug } = await params;
  const snapshot = await getDocsSnapshot();
  const meta = snapshot.featuresBySlug[featureSlug];
  if (!meta) notFound();

  const docKeys = await listFeatureDocKeys(featureSlug);
  const primaryOrder = ["hld", "components", "usecases", "repositories", "components-android", "components-ios"];

  const ordered = Array.from(new Set([...primaryOrder, ...docKeys])).filter((k) => docKeys.includes(k) || primaryOrder.includes(k));

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{meta.name}</h1>
          <Badge variant={statusVariant(meta.status)}>{meta.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{meta.description}</p>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {meta.platforms.map((p) => (
            <Badge key={p} variant="outline">
              {p}
            </Badge>
          ))}
          {meta.hasAnalyticsFlow && meta.analyticsFlowSlug ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/analytics/flows/${encodeURIComponent(meta.analyticsFlowSlug)}`}>
                View analytics flow
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Pages</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((key) => {
            const exists = docKeys.includes(key);
            return (
              <Card key={key} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{labelForDocKey(key)}</CardTitle>
                    <Badge variant={exists ? "secondary" : "outline"}>{exists ? "available" : "missing"}</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {exists ? `content/docs/features/*/${key}.md` : `Create ${key}.md to enable this page.`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <Button asChild size="sm" variant={exists ? "default" : "outline"}>
                    <Link href={`/docs/features/${encodeURIComponent(featureSlug)}/${encodeURIComponent(key)}`}>
                      Open
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

