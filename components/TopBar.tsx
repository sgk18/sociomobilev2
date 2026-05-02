"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import { ArrowLeftIcon, UserIcon } from "@/components/icons";

// Pages that show back button instead of logo
const BACK_PAGES = ["/event/", "/fest/", "/notifications"];

export default function TopBar() {
  const { userData } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const showBack = BACK_PAGES.some((p) => pathname.startsWith(p));
  const isProfile = pathname === "/profile";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 will-change-none border-b transition-colors duration-200 ${
        isProfile
          ? "bg-[var(--color-primary-dark)] border-transparent text-white"
          : "glass border-[var(--color-border)] text-[var(--color-text)]"
      }`}
      style={{ paddingTop: "var(--safe-top)", backfaceVisibility: "hidden" }}
    >
      <div
        className="relative flex items-center px-4 gap-2 will-change-none"
        style={{ height: "var(--nav-height)" }}
      >
        {/* Left: Back button or profile/avatar */}
        {showBack ? (
          <button
            onClick={() => router.back()}
            className="back-btn"
            aria-label="Go back"
          >
            <ArrowLeftIcon size={18} strokeWidth={2.2} />
          </button>
        ) : userData ? (
          <Link href="/profile" className="shrink-0">
            {userData.avatar_url ? (
              <Image
                src={userData.avatar_url}
                alt={userData.name}
                width={34}
                height={34}
                className={`rounded-full object-cover shadow-[0_4px_14px_rgba(1,31,123,0.12)] ${
                  isProfile ? "ring-2 ring-[var(--color-primary)]" : "ring-2 ring-white"
                }`}
              />
            ) : (
              <div className="w-[34px] h-[34px] rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold shadow-[0_4px_14px_rgba(1,31,123,0.12)]">
                {userData.name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
          </Link>
        ) : (
          <Link href="/auth" className="w-[34px] h-[34px] rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0 shadow-[0_4px_14px_rgba(1,31,123,0.12)]">
            <UserIcon size={18} />
          </Link>
        )}

        {!showBack && (
          <Link
            href="/"
            className={`absolute left-1/2 -translate-x-1/2 text-[17px] font-black tracking-tight ${
              isProfile ? "text-white" : "text-[var(--color-primary)]"
            }`}
            aria-label="Go to home"
          >
            SOCIO
          </Link>
        )}

        <div className="flex-1" />

        {/* Right actions */}
        {userData ? (
          <NotificationBell />
        ) : (
          <Link
            href="/auth"
            className="btn btn-primary btn-sm text-[11px] !py-1 !px-3 !min-h-0"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
