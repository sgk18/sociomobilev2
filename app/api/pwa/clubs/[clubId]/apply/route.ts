import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
export const dynamic = "force-dynamic";

const parseClubApplicants = (value: unknown): Array<{ regno?: string; email?: string }> => {
  const parsed =
    typeof value === "string"
      ? (() => { try { return JSON.parse(value); } catch { return []; } })()
      : value;
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") return [parsed as any];
  return [];
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { role, name, email, regno } = body;

    if (!role) {
      return NextResponse.json({ error: "Role is required" }, { status: 400 });
    }
    if (!email && !regno) {
      return NextResponse.json({ error: "Email or register number required" }, { status: 400 });
    }

    // Fetch the club
    const bySlug = await supabase.from("clubs").select("*").eq("slug", clubId).maybeSingle();
    const resolved = bySlug.data
      ? bySlug
      : await supabase.from("clubs").select("*").eq("club_id", clubId).maybeSingle();

    if (resolved.error || !resolved.data) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const club = resolved.data;

    if (!club.club_registrations) {
      return NextResponse.json({ error: "Registrations are currently closed." }, { status: 400 });
    }

    // Check if already applied
    const existingApplicants = parseClubApplicants(club.clubs_applicants ?? club.clubs_applicant);
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedRegno = String(regno || "").trim().toUpperCase();

    const alreadyApplied = existingApplicants.some((entry) => {
      const entryEmail = String(entry?.email ?? "").trim().toLowerCase();
      const entryRegno = String(entry?.regno ?? "").trim().toUpperCase();
      if (normalizedEmail && entryEmail === normalizedEmail) return true;
      if (normalizedRegno && entryRegno === normalizedRegno) return true;
      return false;
    });

    if (alreadyApplied) {
      return NextResponse.json({ error: "You have already applied to this club." }, { status: 409 });
    }

    // Build new applicant entry
    const newApplicant = {
      regno: normalizedRegno,
      name: String(name || "").trim(),
      email: normalizedEmail,
      role_applied_for: role,
      applied_at: new Date().toISOString(),
    };

    const updatedApplicants = [...existingApplicants, newApplicant];

    // Update the club record
    const { error: updateError } = await supabase
      .from("clubs")
      .update({
        clubs_applicants: updatedApplicants,
        clubs_applicant: updatedApplicants,
      })
      .eq("club_id", club.club_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, applicant: newApplicant }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to submit application" }, { status: 500 });
  }
}
