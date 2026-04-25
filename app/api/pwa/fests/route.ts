import { NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const cacheControl = authHeader
    ? "private, max-age=120, stale-while-revalidate=600"
    : "public, max-age=300, stale-while-revalidate=86400";

  try {
    const res = await fetch(`${API_URL}/api/fests`, {
      headers: authHeader ? { Authorization: authHeader } : undefined,
      next: { revalidate: 300 },
    });

    const bodyText = await res.text();
    return new NextResponse(bodyText, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
        "Cache-Control": cacheControl,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch fests", fests: [] }, { status: 502 });
  }
}
