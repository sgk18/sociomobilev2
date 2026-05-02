import { NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 });
    }

    const res = await fetch(`${API_URL}/api/users/me`, {
      headers: {
        Authorization: authHeader,
      },
      cache: "no-store",
    });

    const bodyText = await res.text();
    console.log(`GET /api/users/me Auth: ${authHeader.substring(0, 20)}... Status: ${res.status} Body: ${bodyText}`);
    return new NextResponse(bodyText, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 502 });
  }
}
