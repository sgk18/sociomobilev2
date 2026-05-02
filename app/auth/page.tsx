"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, ArrowRightIcon, GlobeIcon, HelpCircleIcon, Loader2Icon, SchoolIcon, WifiOffIcon } from "@/components/icons";
import { useAuth } from "@/context/AuthContext";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5">
      <path
        d="M21.6 12.23c0-.73-.07-1.43-.18-2.09H12v3.96h5.39a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.97-4.33 2.97-7.39Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.96-.89 6.61-2.39l-3.24-2.5c-.89.6-2.03.95-3.37.95-2.6 0-4.8-1.76-5.58-4.12H3.07v2.58A9.98 9.98 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.42 13.94A6.03 6.03 0 0 1 6.1 12c0-.67.12-1.32.32-1.94V7.48H3.07A10.05 10.05 0 0 0 2 12c0 1.61.39 3.13 1.07 4.52l3.35-2.58Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.94c1.47 0 2.8.5 3.85 1.49l2.88-2.88C16.95 2.9 14.7 2 12 2a9.98 9.98 0 0 0-8.93 5.48l3.35 2.58C7.2 7.7 9.4 5.94 12 5.94Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function AuthPage() {
  const { session, isLoading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncOnlineState = () => setIsOffline(!window.navigator.onLine);
    syncOnlineState();

    window.addEventListener("online", syncOnlineState);
    window.addEventListener("offline", syncOnlineState);
    return () => {
      window.removeEventListener("online", syncOnlineState);
      window.removeEventListener("offline", syncOnlineState);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const error = new URLSearchParams(window.location.search).get("error");
    if (!error) {
      setAuthError(null);
      return;
    }

    if (error === "missing_supabase_config") {
      setAuthError("Sign-in is not configured for this environment yet.");
      return;
    }

    setAuthError("Authentication failed. Please try again.");
  }, []);

  useEffect(() => {
    if (isLoading || !session) return;

    let destination = "/discover";
    if (typeof window !== "undefined") {
      const returnTo = sessionStorage.getItem("returnTo");
      if (returnTo && returnTo.startsWith("/")) {
        destination = returnTo;
      }
      sessionStorage.removeItem("returnTo");
    }
    router.replace(destination);
  }, [session, isLoading, router]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } catch {
      setAuthError("Could not start Google sign-in. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: "radial-gradient(#c3c6d5 0.7px, transparent 0.7px)", backgroundSize: "24px 24px" }} />
      <div className="absolute -top-20 -right-16 h-72 w-72 rounded-full bg-[var(--color-primary)]/12 blur-3xl" />
      <div className="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-[var(--color-accent)]/18 blur-3xl" />

      <main className="relative mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-6 pt-[calc(var(--nav-height)+var(--safe-top)+32px)] pb-24">
        <section className="flex flex-1 flex-col justify-center gap-10">
          <header className="flex flex-col items-center text-center">
            <div className="flex h-18 w-18 items-center justify-center rounded-[22px] bg-[var(--color-primary)] shadow-[0_14px_40px_rgba(1,31,123,0.18)]">
              <SchoolIcon className="h-9 w-9 text-white" strokeWidth={2.2} />
            </div>
            <div className="mt-5 space-y-2">
              <Image
                src="/logo.svg"
                alt="SOCIO"
                width={170}
                height={50}
                priority
                className="mx-auto h-auto w-[170px]"
              />
              <p className="mx-auto max-w-[260px] text-sm font-medium leading-relaxed text-[var(--color-text-muted)]">
                Discover, register, and manage campus events.
              </p>
            </div>
          </header>

          <section>
              <div className="rounded-[28px] border border-white bg-white/92 p-8 shadow-[0_10px_40px_rgba(1,31,123,0.08)] backdrop-blur-sm">
              <div className="mb-8">
                <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-primary-dark)]">
                  Welcome
                </h1>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  Sign in to join your campus community.
                </p>
              </div>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting || isLoading || isOffline}
                  className="flex h-[52px] w-full items-center justify-center gap-3 rounded-xl bg-[var(--color-primary)] px-4 font-bold text-white shadow-[0_10px_24px_rgba(1,31,123,0.16)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting || isLoading ? (
                    <>
                      <Loader2Icon className="h-5 w-5 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <GoogleMark />
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>

                <p className="px-4 text-center text-[11px] font-semibold leading-relaxed text-[var(--color-text-muted)]">
                  Students, staff, and approved visitors can continue with Google.
                </p>
              </div>

              {authError && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                  <div className="flex items-start gap-3 text-red-700">
                    <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-xs font-semibold leading-relaxed">{authError}</p>
                  </div>
                </div>
              )}

              {isOffline && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[var(--color-bg)] px-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-border)] text-[var(--color-text-muted)]">
                    <WifiOffIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold">You&apos;re offline</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      Check your connection and try again.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-8 flex justify-center">
                <Link
                  href="/privacy"
                  className="text-xs font-bold text-[var(--color-primary)] underline decoration-2 underline-offset-4"
                >
                  Privacy &amp; Terms
                </Link>
              </div>
            </div>

            <p className="px-8 pt-5 text-center text-[11px] leading-relaxed text-[var(--color-text-light)]">
              By continuing, you agree to our <Link href="/terms" className="underline">Terms of Service</Link> and{" "}
              <Link href="/privacy" className="underline">Privacy Policy</Link>.
            </p>
          </section>

          <section className="grid gap-4">
            <div className="rounded-2xl border border-white bg-white/70 p-4 shadow-sm backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                  <ArrowRightIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-[var(--color-primary-dark)]">Fast sign-in</h2>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Your profile, registrations, and notifications stay in sync.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-white/60 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-bg)] text-[var(--color-text-muted)]">
                  <HelpCircleIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">Need help signing in?</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Use the same Google account you use with SOCIO on web.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </section>
      </main>

    </div>
  );
}
