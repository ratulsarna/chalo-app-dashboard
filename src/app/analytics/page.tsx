import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AnalyticsHomePage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
        <p className="max-w-2xl text-muted-foreground">
          Understand user journeys and validate instrumentation. Use search to quickly find
          where an event is fired and what properties it sends.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="secondary">Tip: press ⌘K</Badge>
          <Badge variant="outline">Dark mode default</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/analytics/flows" className="block">
          <Card className="h-full transition-colors hover:bg-accent/30">
            <CardHeader>
              <CardTitle className="text-base">Browse flows</CardTitle>
              <CardDescription>
                Start from a journey. See funnel diagram, stages, and events.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/analytics/events?q=" className="block">
          <Card className="h-full transition-colors hover:bg-accent/30">
            <CardHeader>
              <CardTitle className="text-base">Search events</CardTitle>
              <CardDescription>
                Find an event by partial match (name, stage, component).
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/analytics/flows/search" className="block">
          <Card className="h-full transition-colors hover:bg-accent/30">
            <CardHeader>
              <CardTitle className="text-base">Explore a flow</CardTitle>
              <CardDescription>
                Example: jump into Search and review its instrumentation.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
