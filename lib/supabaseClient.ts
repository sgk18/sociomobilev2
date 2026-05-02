import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase env vars missing — auth will not work");
} else {
  console.log("✅ Supabase initialized with URL:", supabaseUrl);
}

/**
 * Shared cookie options — long maxAge keeps the session alive in PWA
 * standalone mode, where session-cookies are wiped when the app closes.
 */
export const COOKIE_OPTIONS = {
  maxAge: 365 * 24 * 60 * 60, // 1 year (seconds)
  path: "/",
  sameSite: "lax" as const,
};

export const supabase = createBrowserClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
  { cookieOptions: COOKIE_OPTIONS }
);
