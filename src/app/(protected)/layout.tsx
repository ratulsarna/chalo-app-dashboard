import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, isAuthEnabled, verifyAuthCookie } from "@/lib/auth";

async function getNextPath() {
  const headerList = await headers();
  const rawUrl =
    headerList.get("x-next-url") ??
    headerList.get("x-original-url") ??
    headerList.get("x-forwarded-uri");

  if (!rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl, "http://localhost");
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  if (!isAuthEnabled()) {
    return children;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const isValid = await verifyAuthCookie(token);
  if (isValid) {
    return children;
  }

  const nextPath = await getNextPath();
  if (nextPath) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  redirect("/login");
}
