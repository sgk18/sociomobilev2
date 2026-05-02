"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface ShakeToScanState {
  activeScanEvent: string | null;
  shakeEnabled: boolean;
}

type MotionPermission = "unknown" | "granted" | "denied";

interface ShakeToScanContextValue extends ShakeToScanState {
  motionSupported: boolean;
  motionPermission: MotionPermission;
  enableForEvent: (eventId: string) => void;
  disableShake: () => void;
  requestMotionPermission: () => Promise<boolean>;
}

const STORAGE_KEY = "socio_shake_to_scan";
const DEFAULT_STATE: ShakeToScanState = { activeScanEvent: null, shakeEnabled: false };

function readStoredState(): ShakeToScanState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<ShakeToScanState>;
    const activeScanEvent = typeof parsed.activeScanEvent === "string" ? parsed.activeScanEvent : null;
    const shakeEnabled = Boolean(parsed.shakeEnabled && activeScanEvent);
    return { activeScanEvent, shakeEnabled };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return DEFAULT_STATE;
  }
}

function writeStoredState(state: ShakeToScanState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const ShakeToScanContext = createContext<ShakeToScanContextValue>({
  ...DEFAULT_STATE,
  motionSupported: false,
  motionPermission: "unknown",
  enableForEvent: () => {},
  disableShake: () => {},
  requestMotionPermission: async () => false,
});

export function useShakeToScan() {
  const context = useContext(ShakeToScanContext);
  if (!context) {
    throw new Error("useShakeToScan must be used within a ShakeToScanProvider");
  }
  return context;
}

export function ShakeToScanProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShakeToScanState>(DEFAULT_STATE);
  const [motionPermission, setMotionPermission] = useState<MotionPermission>("unknown");

  const motionSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    // Safely check for DeviceMotionEvent on window object
    return "DeviceMotionEvent" in window && typeof (window as any).DeviceMotionEvent !== "undefined";
  }, []);

  useEffect(() => {
    setState(readStoredState());
  }, []);

  useEffect(() => {
    if (!motionSupported || typeof window === "undefined") {
      setMotionPermission("denied");
      return;
    }

    // Check if requestPermission is needed (iOS Safari)
    const dmEvent = (window as any).DeviceMotionEvent;
    if (dmEvent && typeof dmEvent.requestPermission !== "function") {
      setMotionPermission("granted");
    }
  }, [motionSupported]);

  const updateState = useCallback((next: ShakeToScanState) => {
    setState(next);
    writeStoredState(next);
  }, []);

  const enableForEvent = useCallback(
    (eventId: string) => {
      if (!eventId) return;
      updateState({ activeScanEvent: eventId, shakeEnabled: true });
    },
    [updateState]
  );

  const disableShake = useCallback(() => {
    updateState(DEFAULT_STATE);
  }, [updateState]);

  const requestMotionPermission = useCallback(async () => {
    if (typeof window === "undefined") return false;
    if (!motionSupported) {
      setMotionPermission("denied");
      return false;
    }

    const dmEvent = (window as any).DeviceMotionEvent;
    if (dmEvent && typeof dmEvent.requestPermission === "function") {
      try {
        const result = await dmEvent.requestPermission();
        const granted = result === "granted";
        setMotionPermission(granted ? "granted" : "denied");
        return granted;
      } catch (e) {
        console.error("ShakeToScan: Permission request failed", e);
        setMotionPermission("denied");
        return false;
      }
    }

    setMotionPermission("granted");
    return true;
  }, [motionSupported]);

  return (
    <ShakeToScanContext.Provider
      value={{
        activeScanEvent: state.activeScanEvent,
        shakeEnabled: state.shakeEnabled,
        motionSupported,
        motionPermission,
        enableForEvent,
        disableShake,
        requestMotionPermission,
      }}
    >
      {children}
    </ShakeToScanContext.Provider>
  );
}

export default ShakeToScanProvider;
