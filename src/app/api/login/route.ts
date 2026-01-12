import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, createAuthCookie, isAuthEnabled, verifyCredentials } from "@/lib/auth";

function getRequestOrigin(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const proto = (forwardedProto?.split(",")[0]?.trim() || request.nextUrl.protocol).replace(/:$/, "");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost?.split(",")[0]?.trim() || request.headers.get("host") || request.nextUrl.host;

  return `${proto}://${host}`;
}

function getSafeNext(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.length === 0) {
    return "/";
  }
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

export async function POST(request: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.redirect(new URL("/", getRequestOrigin(request)), 303);
  }

  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const nextPath = getSafeNext(formData.get("next"));

  const isValid = await verifyCredentials(username, password);
  if (!isValid) {
    const loginUrl = new URL("/login", getRequestOrigin(request));
    loginUrl.searchParams.set("error", "1");
    if (nextPath !== "/") loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl, 303);
  }

  const token = await createAuthCookie(username);
  const response = NextResponse.redirect(new URL(nextPath, getRequestOrigin(request)), 303);
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
