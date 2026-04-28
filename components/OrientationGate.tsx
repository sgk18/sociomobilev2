"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

/**
 * Full-screen overlay shown when a mobile device is held in landscape orientation.
 * It forces the user to rotate back to portrait.
 */
export default function OrientationGate() {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    // Only applies if it's a touch device (coarse pointer) or small screen to prevent triggering on actual desktops
    const mql = window.matchMedia("(orientation: landscape) and (max-width: 1024px) and (pointer: coarse)");
    
    const handleOrientationChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsLandscape(e.matches);
    };

    // Initial check
    handleOrientationChange(mql);

    // Listen for changes
    mql.addEventListener("change", handleOrientationChange);
    return () => mql.removeEventListener("change", handleOrientationChange);
  }, []);

  if (!isLandscape) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--color-primary-dark)] text-white px-6 text-center"
      aria-label="Orientation lock notice"
    >
      <div className="animate-bounce-in mb-6">
        {/* Animate the icon to suggest rotating the phone */}
        <div className="animate-[spin_3s_ease-in-out_infinite]">
          <Smartphone size={80} strokeWidth={1} />
        </div>
      </div>

      <h1 className="text-3xl font-extrabold leading-tight mb-3 animate-fade-up">
        Please rotate your device
      </h1>
      <p className="text-[15px] opacity-80 max-w-xs animate-fade-up" style={{ animationDelay: "80ms" }}>
        We don&apos;t support landscape mode yet. Please rotate your device back to portrait to continue using SOCIO.
      </p>
    </div>
  );
}
