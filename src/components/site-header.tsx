import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const authEnabled = Boolean(
    process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD && process.env.AUTH_SECRET,
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="font-semibold tracking-tight">
            Chalo Dashboard
          </Link>
        </div>
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/analytics">Analytics</Link>
          </Button>
          {authEnabled ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/api/logout">Sign out</Link>
            </Button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
