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
  return useContext(ShakeToScanContext);
}

export function ShakeToScanProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShakeToScanState>(DEFAULT_STATE);
  const [motionPermission, setMotionPermission] = useState<MotionPermission>("unknown");

  const motionSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return typeof (window as Window & { DeviceMotionEvent?: unknown }).DeviceMotionEvent !== "undefined";
  }, []);

  useEffect(() => {
    setState(readStoredState());
  }, []);

  useEffect(() => {
    if (!motionSupported) {
      setMotionPermission("denied");
      return;
    }

    const requestPermission = (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> })
      ?.requestPermission;
    if (typeof requestPermission !== "function") {
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

    const permissionFn = (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> })
      ?.requestPermission;
    if (typeof permissionFn === "function") {
      try {
        const result = await permissionFn();
        const granted = result === "granted";
        setMotionPermission(granted ? "granted" : "denied");
        return granted;
      } catch {
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
