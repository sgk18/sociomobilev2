"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, CompassIcon, CalendarDaysIcon, FlameIcon } from "@/components/icons";

const tabs = [
  { href: "/", icon: HomeIcon, label: "Home" },
  { href: "/discover", icon: CompassIcon, label: "Discover" },
  { href: "/events", icon: CalendarDaysIcon, label: "Events" },
  { href: "/fests", icon: FlameIcon, label: "Fests" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
      style={{ paddingBottom: "calc(var(--safe-bottom) + 10px)" }}
    >
      <div
        className="mx-auto w-[min(92vw,360px)] rounded-[22px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.94)] shadow-[0_12px_34px_rgba(17,24,39,0.14)] backdrop-blur-xl pointer-events-auto"
      >
        <div className="grid grid-cols-4 gap-1 p-1.5" style={{ minHeight: "var(--bottom-nav)" }}>
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative btn-active-state flex flex-col items-center justify-center gap-0.5 rounded-[14px] py-2 transition-all duration-200 ${
                active
                  ? "text-[var(--color-primary)] bg-[var(--color-primary-light)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--color-text-light)]"
              }`}
            >

              <div className={`relative transition-transform duration-200 ${active ? "scale-110" : ""}`}>
                <Icon
                  size={20}
                  strokeWidth={active ? 2.4 : 1.6}
                />
              </div>
              <span
                className={`text-[10px] leading-none transition-all ${
                  active ? "font-extrabold" : "font-semibold"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
        </div>
      </div>
    </nav>
  );
}
