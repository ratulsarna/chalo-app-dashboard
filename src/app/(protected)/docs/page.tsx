import Link from "next/link";
import { getDocsSnapshot } from "@/lib/docs";
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

export default async function DocsHomePage() {
  const snapshot = await getDocsSnapshot();

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Docs</h1>
        <p className="text-sm text-muted-foreground">
          Codebase overviews and per-feature design documentation from <code>content/docs</code>.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Overview</h2>
            <p className="text-sm text-muted-foreground">Start here for architecture and conventions.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {snapshot.overviews.map((ov) => (
            <Card key={ov.slug} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">
                    <Link href={`/docs/overview/${encodeURIComponent(ov.slug)}`} className="hover:underline">
                      {ov.name}
                    </Link>
                  </CardTitle>
                  <Badge variant={statusVariant(ov.status)}>{ov.status}</Badge>
                </div>
                <CardDescription className="line-clamp-3">{ov.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/docs/overview/${encodeURIComponent(ov.slug)}`}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Features</h2>
          <p className="text-sm text-muted-foreground">
            Feature HLDs and LLDs (components, use cases, repositories).
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {snapshot.features.map((feat) => (
            <Card key={feat.slug} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">
                    <Link href={`/docs/features/${encodeURIComponent(feat.slug)}`} className="hover:underline">
                      {feat.name}
                    </Link>
                  </CardTitle>
                  <Badge variant={statusVariant(feat.status)}>{feat.status}</Badge>
                </div>
                <CardDescription className="line-clamp-3">{feat.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between gap-3">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/docs/features/${encodeURIComponent(feat.slug)}`}>Browse</Link>
                </Button>
                {feat.hasAnalyticsFlow && feat.analyticsFlowSlug ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/analytics/flows/${encodeURIComponent(feat.analyticsFlowSlug)}`}>Analytics</Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

