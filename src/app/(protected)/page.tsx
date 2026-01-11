import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Internal tools for product analytics and operations.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/analytics" className="block">
          <Card className="transition-colors hover:bg-accent/40">
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                Browse flows, events, and property definitions.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </main>
  );
}
