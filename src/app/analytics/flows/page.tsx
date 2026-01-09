import Link from "next/link";
import { getAnalyticsSnapshot } from "@/lib/analytics";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function AnalyticsFlowsPage() {
  const snapshot = await getAnalyticsSnapshot();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Flows</h1>
      <p className="mt-2 text-muted-foreground">
        Browse analytics flows captured in <code>content/analytics</code>.
      </p>

      <div className="mt-6 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Flow</TableHead>
              <TableHead className="w-[220px]">Slug</TableHead>
              <TableHead className="w-[120px] text-right">Events</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshot.flows.map((flow) => (
              <TableRow key={flow.slug}>
                <TableCell className="font-medium">
                  <Link
                    className="underline underline-offset-4 hover:text-primary"
                    href={`/analytics/flows/${encodeURIComponent(flow.slug)}`}
                  >
                    {flow.flowName}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge variant="outline">{flow.flowId}</Badge>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{flow.slug}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {flow.events.length}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
