import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const COOKIE_OPTIONS = {
  maxAge: 365 * 24 * 60 * 60,
  path: "/",
  sameSite: "lax" as const,
};

const protectedRoutes = ["/profile", "/volunteer"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only gate protected routes
  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  if (!isProtected) return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("error", "missing_supabase_config");
    return NextResponse.redirect(url);
  }

  // Create a Supabase client for SSR
  const response = NextResponse.next();
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: COOKIE_OPTIONS,
      cookies: {
        getAll: () =>
          request.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
        setAll: (cookies: { name: string; value: string; options?: any }[]) =>
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...options, ...COOKIE_OPTIONS })
          ),
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/profile/:path*", "/volunteer/:path*"],
};
