"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRingIcon, XIcon } from "@/components/icons";

const DISMISS_KEY = "browser-notif-prompt-dismissed";
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export default function BrowserNotificationPrompt() {
  const [visible, setVisible] = useState(false);

  const supported = useMemo(
    () => typeof window !== "undefined" && "Notification" in window,
    []
  );

  useEffect(() => {
    if (!supported) return;
    if (Notification.permission !== "default") return;

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_COOLDOWN_MS) {
      return;
    }

    const timer = setTimeout(() => setVisible(true), 1800);
    return () => clearTimeout(timer);
  }, [supported]);

  const enableNotifications = async () => {
    if (!supported) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setVisible(false);
      }
    } catch {}
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  if (!supported || !visible) return null;

  return (
    <div className="fixed bottom-[calc(var(--bottom-nav)+var(--safe-bottom)+84px)] left-4 right-4 z-40 animate-slide-up">
      <div className="card p-3.5 border border-[var(--color-border)] flex items-start gap-3">
        <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
          <BellRingIcon size={17} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-extrabold">Enable Browser Notifications</p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-snug">
            Get event reminders and announcement alerts directly from this website.
          </p>
          <div className="mt-2.5 flex gap-2">
            <button onClick={enableNotifications} className="btn btn-primary btn-sm">
              Allow
            </button>
            <button onClick={dismiss} className="btn btn-ghost btn-sm">
              Not now
            </button>
          </div>
        </div>
        <button onClick={dismiss} className="p-1 text-[var(--color-text-light)]">
          <XIcon size={15} />
        </button>
      </div>
    </div>
  );
}
