import { notFound } from "next/navigation";
import { extractMarkdownToc, getDocsSnapshot, readOverviewDoc, stripLeadingMarkdownH1 } from "@/lib/docs";
import { DocsMarkdown } from "@/components/docs/docs-markdown";
import { DocsToc } from "@/components/docs/docs-toc";
import { Badge } from "@/components/ui/badge";

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

export default async function OverviewDocPage({ params }: { params: Promise<{ overviewSlug: string }> }) {
  const { overviewSlug } = await params;
  const snapshot = await getDocsSnapshot();
  const meta = snapshot.overviewsBySlug[overviewSlug];
  if (!meta) notFound();

  const doc = await readOverviewDoc(overviewSlug);
  const stripped = stripLeadingMarkdownH1(doc.content);
  const title = stripped.title ?? meta.name;
  const toc = extractMarkdownToc(stripped.body);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <Badge variant={statusVariant(meta.status)}>{meta.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{meta.description}</p>
        </div>

        {stripped.body.trim().length ? (
          <DocsMarkdown markdown={stripped.body} />
        ) : (
          <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
            This doc isn’t written yet. Add <code>{`content/docs/overview/${overviewSlug}.md`}</code>.
          </div>
        )}
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-28">
          <DocsToc items={toc} />
        </div>
      </aside>
    </div>
  );
}
