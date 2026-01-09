"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL (see .env.local).");
}

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
