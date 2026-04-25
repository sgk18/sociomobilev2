import { NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:8000")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  try {
    const { registrationId } = await params;
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 });
    }

    const res = await fetch(`${API_URL}/api/registrations/self/${encodeURIComponent(registrationId)}`, {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
      },
      cache: "no-store",
    });

    const bodyText = await res.text();
    return new NextResponse(bodyText, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to cancel registration" }, { status: 502 });
  }
}
