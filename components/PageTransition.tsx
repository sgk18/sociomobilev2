"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * PageTransition — wraps page content with a lightweight CSS-based
 * fade + slide-up transition on route change.
 *
 * Strategy:
 * - We store the previous pathname ref. When pathname changes we reset
 *   the animation by removing / re-adding the animation class so the
 *   browser forces a reflow and replays it.
 * - No JS timers, no layout-heavy props. Only opacity + transform.
 * - will-change is set inline only during the animation then removed.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const prevPathname = useRef<string>(pathname);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Same page mount on first render — just show immediately
    if (prevPathname.current === pathname && document.readyState === "complete") {
      prevPathname.current = pathname;
      return;
    }

    prevPathname.current = pathname;

    // Hint the browser so it can composit on the GPU layer upfront
    el.style.willChange = "opacity, transform";

    // Remove class → force reflow → re-add class to restart animation
    el.classList.remove("page-enter");
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    el.offsetHeight; // trigger reflow (cheap: just reads layout)
    el.classList.add("page-enter");

    // Clean up will-change after animation completes (saves GPU memory)
    const cleanup = () => {
      el.style.willChange = "auto";
      el.removeEventListener("animationend", cleanup);
    };
    el.addEventListener("animationend", cleanup, { once: true });

    return () => {
      el.removeEventListener("animationend", cleanup);
    };
  }, [pathname]);

  return (
    <div ref={ref} className="page-enter" style={{ willChange: "opacity, transform" }}>
      {children}
    </div>
  );
}
