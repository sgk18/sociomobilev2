import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_OPTIONS } from "@/lib/supabaseClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getOrgType(email: string): "christ_member" | "outsider" {
  return email.toLowerCase().endsWith("christuniversity.in")
    ? "christ_member"
    : "outsider";
}

async function createUserInDB(user: any) {
  try {
    const orgType = getOrgType(user.email);
    let fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
    let registerNumber: string | null = null;
    let course: string | null = null;

    if (orgType === "christ_member") {
      const domain = (user.email.split("@")[1] || "").split(".")[0]?.toUpperCase();
      if (domain && domain !== "CHRISTUNIVERSITY") course = domain;
      const lastName = user.user_metadata?.last_name?.trim();
      if (lastName && /^\d+$/.test(lastName)) {
        registerNumber = lastName;
      } else if (fullName) {
        const parts = fullName.split(" ");
        const last = parts[parts.length - 1]?.trim();
        if (/^\d+$/.test(last || "")) {
          registerNumber = last!;
          fullName = parts.slice(0, -1).join(" ");
        }
      }
    }

    const res = await fetch(`${API_URL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          name: fullName || user.email.split("@")[0],
          avatar_url: user.user_metadata?.avatar_url,
          register_number: registerNumber,
          course,
        },
      }),
    });
    
    if (!res.ok) {
      console.error(`Failed to create user in DB: ${res.status} ${await res.text().catch(() => "")}`);
    }
  } catch (err) {
    console.error("Error in createUserInDB:", err);
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const appOrigin = `${url.protocol}//${url.host}`;
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${appOrigin}/?error=no_code`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: COOKIE_OPTIONS,
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: any }[]) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, { ...options, ...COOKIE_OPTIONS });
          });
        },
      },
    }
  );

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    if (data.user) await createUserInDB(data.user);
    // Redirect to /auth so the auth page can pick up sessionStorage.returnTo
    return NextResponse.redirect(`${appOrigin}/auth`);
  } catch (err) {
    console.error("Auth callback error:", err);
    try { await supabase.auth.signOut(); } catch {}
    return NextResponse.redirect(`${appOrigin}/?error=auth_failed`);
  }
}
