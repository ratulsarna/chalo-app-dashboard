import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsHomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          MVP: browse flows and search events/properties.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/analytics/flows" className="block">
          <Card className="transition-colors hover:bg-accent/40">
            <CardHeader>
              <CardTitle>Flows</CardTitle>
              <CardDescription>Browse journeys and their events.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/analytics/events" className="block">
          <Card className="transition-colors hover:bg-accent/40">
            <CardHeader>
              <CardTitle>Events</CardTitle>
              <CardDescription>Search by name, stage, or component.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </main>
  );
}
