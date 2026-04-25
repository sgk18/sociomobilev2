import { NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:8000").replace(/\/api\/?$/, "").replace(/\/$/, "");

export async function GET(request: NextRequest) {
  try {
    const registerNumber = request.nextUrl.searchParams.get("registerNumber");
    const email = request.nextUrl.searchParams.get("email");
    if (!registerNumber && !email) {
      return NextResponse.json({ error: "registerNumber or email required" }, { status: 400 });
    }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (registerNumber) {
      const byRegRes = await fetch(
        `${API_URL}/api/registrations/user/${encodeURIComponent(registerNumber)}/events`,
        { headers, next: { revalidate: 30 } }
      );

      if (byRegRes.ok) {
        const byRegData = await byRegRes.json();
        const events = byRegData.events ?? byRegData ?? [];
        const normalized = (Array.isArray(events) ? events : [])
          .map((event: any) => ({
            event_id: event?.event_id || event?.id,
            event,
          }))
          .filter((registration: any) => Boolean(registration.event_id));
        return NextResponse.json(normalized, {
          status: 200,
          headers: {
            "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
          },
        });
      }

      console.error("[registrations] registerNumber lookup failed:", byRegRes.status, byRegRes.statusText);
    }

    if (email) {
      const byEmailRes = await fetch(
        `${API_URL}/api/registrations?email=${encodeURIComponent(email)}`,
        { headers, next: { revalidate: 30 } }
      );

      if (!byEmailRes.ok) {
        console.error("[registrations] email lookup failed:", byEmailRes.status, byEmailRes.statusText);
        return NextResponse.json([], { status: 200 });
      }

      const byEmailData = await byEmailRes.json();
      const registrations = byEmailData.registrations ?? byEmailData ?? [];
      return NextResponse.json(Array.isArray(registrations) ? registrations : [], {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
        },
      });
    }

    return NextResponse.json([], { status: 200 });
  } catch (error) {
    console.error("[registrations] Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
