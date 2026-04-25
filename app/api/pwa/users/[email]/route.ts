import { NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const { email } = await params;

  try {
    const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(email)}`, {
      next: { revalidate: 60 },
    });

    const bodyText = await res.text();
    return new NextResponse(bodyText, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch user data" }, { status: 502 });
  }
}
