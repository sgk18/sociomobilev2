import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;

    // Try by slug first, then by club_id
    const bySlug = await supabase.from("clubs").select("*").eq("slug", clubId).maybeSingle();
    const resolved = bySlug.data
      ? bySlug
      : await supabase.from("clubs").select("*").eq("club_id", clubId).maybeSingle();

    if (resolved.error) {
      return NextResponse.json({ error: resolved.error.message }, { status: 500 });
    }
    if (!resolved.data) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    return NextResponse.json({ club: resolved.data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to fetch club" }, { status: 500 });
  }
}
