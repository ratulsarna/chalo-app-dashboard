import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, isAuthEnabled, verifyAuthCookie } from "@/lib/auth";

export async function SiteHeader() {
  const authEnabled = isAuthEnabled();
  let isSignedIn = false;

  if (authEnabled) {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    isSignedIn = await verifyAuthCookie(token);
  }

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
          <Button asChild variant="ghost" size="sm">
            <Link href="/docs">Docs</Link>
          </Button>
          {authEnabled && !isSignedIn ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          ) : null}
          {authEnabled && isSignedIn ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/api/logout" prefetch={false}>Sign out</Link>
            </Button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
