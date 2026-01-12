import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="max-w-2xl text-muted-foreground">
          Quick operational dashboards generated from server logs.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/reports/traffic" className="block">
          <Card className="h-full transition-colors hover:bg-accent/30">
            <CardHeader>
              <CardTitle className="text-base">Traffic</CardTitle>
              <CardDescription>Nginx access log report (GoAccess).</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <p className="text-sm text-muted-foreground">
        Tip: generate/update the report at{" "}
        <code className="rounded bg-muted px-1.5 py-0.5">public/reports/traffic.html</code>.
      </p>
    </div>
  );
}

