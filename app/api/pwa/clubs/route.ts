import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from("clubs")
      .select(
        "club_id,club_name,subtitle,club_description,club_web_link,slug,club_banner_url,type,category,club_registrations,club_roles_available"
      )
      .order("club_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message, clubs: [] }, { status: 500 });
    }

    return NextResponse.json(
      { clubs: data ?? [] },
      {
        status: 200,
        headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=600" },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to fetch clubs", clubs: [] }, { status: 500 });
  }
}
