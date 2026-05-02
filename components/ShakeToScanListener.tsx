"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useShakeToScan } from "@/context/ShakeToScanContext";
import { getActiveVolunteerEvents } from "@/lib/volunteerAccess";

const SAMPLE_INTERVAL_MS = 80;
const SHAKE_THRESHOLD = 12;
const SHAKE_THRESHOLD_WITH_GRAVITY = 8;
const MIN_SPIKE_INTERVAL_MS = 180;
const SHAKE_WINDOW_MS = 550;
const TRIGGER_COOLDOWN_MS = 2500;

export default function ShakeToScanListener() {
  const router = useRouter();
  const pathname = usePathname();
  const { userData } = useAuth();
  const {
    activeScanEvent,
    shakeEnabled,
    motionSupported,
    motionPermission,
    disableShake,
  } = useShakeToScan();

  const lastSampleRef = useRef(0);
  const lastSpikeRef = useRef(0);
  const spikeCountRef = useRef(0);
  const lastTriggerRef = useRef(0);

  const activeVolunteerEvents = useMemo(
    () => getActiveVolunteerEvents(userData?.volunteerEvents),
    [userData?.volunteerEvents]
  );

  const isVolunteer = activeVolunteerEvents.length > 0;

  useEffect(() => {
    if (!shakeEnabled || !activeScanEvent) return;
    if (!isVolunteer) {
      disableShake();
      return;
    }

    const stillAssigned = activeVolunteerEvents.some((event) => event.event_id === activeScanEvent);
    if (!stillAssigned) {
      disableShake();
    }
  }, [activeScanEvent, activeVolunteerEvents, disableShake, isVolunteer, shakeEnabled]);

  useEffect(() => {
    if (!shakeEnabled || !activeScanEvent) return;
    if (!isVolunteer) return;
    if (!motionSupported || motionPermission === "denied") return;
    if (pathname.startsWith("/volunteer/scanner/")) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const now = Date.now();
      if (now - lastSampleRef.current < SAMPLE_INTERVAL_MS) return;
      lastSampleRef.current = now;

      const data = event.acceleration || event.accelerationIncludingGravity;
      if (!data) return;

      const x = data.x ?? 0;
      const y = data.y ?? 0;
      const z = data.z ?? 0;
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const adjusted = event.acceleration ? magnitude : Math.abs(magnitude - 9.81);
      const threshold = event.acceleration ? SHAKE_THRESHOLD : SHAKE_THRESHOLD_WITH_GRAVITY;

      if (adjusted < threshold) return;
      if (now - lastSpikeRef.current < MIN_SPIKE_INTERVAL_MS) return;

      if (now - lastSpikeRef.current > SHAKE_WINDOW_MS) {
        spikeCountRef.current = 0;
      }

      spikeCountRef.current += 1;
      lastSpikeRef.current = now;

      if (spikeCountRef.current < 2) return;
      if (now - lastTriggerRef.current < TRIGGER_COOLDOWN_MS) return;

      spikeCountRef.current = 0;
      lastTriggerRef.current = now;

      if (!activeScanEvent || document.visibilityState !== "visible") return;
      router.push(`/volunteer/scanner/${encodeURIComponent(activeScanEvent)}`);
    };

    window.addEventListener("devicemotion", handleMotion, { passive: true });
    return () => {
      window.removeEventListener("devicemotion", handleMotion);
    };
  }, [
    activeScanEvent,
    isVolunteer,
    motionPermission,
    motionSupported,
    pathname,
    router,
    shakeEnabled,
  ]);

  return null;
}
