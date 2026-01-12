import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const reportPath = path.join(process.cwd(), "public", "reports", "traffic.html");

  try {
    const html = await readFile(reportPath, "utf8");
    return new NextResponse(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "traffic_report_not_found", path: "/public/reports/traffic.html" },
      { status: 404 },
    );
  }
}

