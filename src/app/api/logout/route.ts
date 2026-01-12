import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

function getRequestOrigin(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const proto = (forwardedProto?.split(",")[0]?.trim() || request.nextUrl.protocol).replace(/:$/, "");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost?.split(",")[0]?.trim() || request.headers.get("host") || request.nextUrl.host;

  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", getRequestOrigin(request)), 303);
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
