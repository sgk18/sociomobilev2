"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, type VolunteerEvent } from "@/context/AuthContext";
import { useShakeToScan } from "@/context/ShakeToScanContext";
import LoadingScreen from "@/components/LoadingScreen";
import { Button } from "@/components/Button";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  Clock3Icon,
  MapPinIcon,
  QrCodeIcon,
} from "@/components/icons";
import { formatDateShort, formatTime } from "@/lib/dateUtils";
import { getActiveVolunteerEvents } from "@/lib/volunteerAccess";

const DENIED_MESSAGE = "You do not have permission to access this feature";

export default function VolunteerDashboardPage() {
  const router = useRouter();
  const { session, userData, isLoading } = useAuth();
  const {
    activeScanEvent,
    shakeEnabled,
    enableForEvent,
    disableShake,
    requestMotionPermission,
    motionSupported,
    motionPermission,
  } = useShakeToScan();
  const [events, setEvents] = useState<VolunteerEvent[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shakeError, setShakeError] = useState<string | null>(null);

  const cachedActiveEvents = useMemo(
    () => getActiveVolunteerEvents(userData?.volunteerEvents),
    [userData?.volunteerEvents]
  );

  const activeShakeEvent = useMemo(() => {
    const source = events.length > 0 ? events : cachedActiveEvents;
    return source.find((item) => item.event_id === activeScanEvent) || null;
  }, [activeScanEvent, cachedActiveEvents, events]);

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/auth");
    }
  }, [isLoading, router, session]);

  const handleToggleShake = async (eventId: string) => {
    setShakeError(null);

    if (shakeEnabled && activeScanEvent === eventId) {
      disableShake();
      return;
    }

    if (!motionSupported) {
      setShakeError("Motion sensors are not available on this device.");
      return;
    }

    const granted = await requestMotionPermission();
    if (!granted) {
      setShakeError("Motion permission is required to enable shake to scan.");
      return;
    }

    enableForEvent(eventId);
  };

  useEffect(() => {
    if (isLoading) return;
    if (!session?.access_token) {
      setIsFetching(false);
      return;
    }

    let cancelled = false;

    async function fetchVolunteerEvents() {
      setIsFetching(true);
      setError(null);
      setEvents(cachedActiveEvents);

      try {
        const res = await fetch("/api/pwa/volunteer/events", {
          headers: {
            Authorization: `Bearer ${session!.access_token}`,
          },
          cache: "no-store",
        });
        const payload = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (!res.ok) {
          setEvents([]);
          setError(payload.error || DENIED_MESSAGE);
          return;
        }

        const nextEvents = getActiveVolunteerEvents(payload.events || []);
        setEvents(nextEvents);
      } catch {
        if (!cancelled) {
          setEvents([]);
          setError("Unable to load volunteer assignments.");
        }
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    }

    void fetchVolunteerEvents();

    return () => {
      cancelled = true;
    };
  }, [cachedActiveEvents, isLoading, session]);

  if (isLoading || (isFetching && events.length === 0)) {
    return <LoadingScreen />;
  }

  const denied = error || events.length === 0;

  return (
    <div className="pwa-page min-h-screen px-4 pb-[calc(var(--bottom-nav)+var(--safe-bottom)+96px)] pt-[calc(var(--nav-height)+var(--safe-top)+16px)]">
      <div className="mx-auto max-w-[420px] space-y-5">
        <section className="rounded-[26px] bg-[var(--color-primary-dark)] px-5 py-6 text-white shadow-[0_12px_32px_rgba(1,31,123,0.18)]">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12">
              <QrCodeIcon size={24} />
            </div>
            <div>
              <h1 className="text-[22px] font-black tracking-[-0.02em]">Volunteer Dashboard</h1>
              <p className="mt-1 text-[12px] leading-5 text-blue-100">
                Assigned event scanners only. Access closes when the event ends.
              </p>
            </div>
          </div>
        </section>

        {denied ? (
          <section className="card p-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangleIcon size={22} />
            </div>
            <h2 className="text-[16px] font-extrabold text-[var(--color-text)]">Access unavailable</h2>
            <p className="mx-auto mt-2 max-w-[280px] text-[13px] leading-5 text-[var(--color-text-muted)]">
              {error || DENIED_MESSAGE}
            </p>
            <Button variant="primary" className="mt-4" onClick={() => router.replace("/")}>
              Back Home
            </Button>
          </section>
        ) : (
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[16px] font-extrabold text-[var(--color-text)]">Assigned Events</h2>
              <span className="rounded-full bg-[var(--color-primary-light)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-primary)]">
                {events.length}
              </span>
            </div>

            <section className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-[14px] font-extrabold text-[var(--color-text)]">Shake to Scan</h3>
                  {shakeEnabled && activeScanEvent && activeShakeEvent ? (
                    <p className="mt-1 text-[12px] font-semibold text-emerald-700">
                      Shake to Scan Enabled for {activeShakeEvent.title}
                    </p>
                  ) : (
                    <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
                      Enable a single event for quick scanner access.
                    </p>
                  )}
                </div>
                {shakeEnabled && activeScanEvent ? (
                  <Button variant="ghost" size="sm" onClick={() => {
                    setShakeError(null);
                    disableShake();
                  }}>
                    Disable
                  </Button>
                ) : null}
              </div>
              {motionSupported && motionPermission === "denied" && (
                <p className="mt-2 text-[11px] font-semibold text-red-600">
                  Motion access is blocked. Enable motion permissions in your browser settings.
                </p>
              )}
              {shakeError && (
                <p className="mt-2 text-[11px] font-semibold text-red-600">{shakeError}</p>
              )}
            </section>

            {events.map((event) => (
              <Link
                key={event.event_id}
                href={`/volunteer/scanner/${encodeURIComponent(event.event_id)}`}
                className="card block p-4 active:scale-[0.99]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                    <QrCodeIcon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-extrabold text-[var(--color-text)]">{event.title}</h3>
                    <div className="mt-2 space-y-1 text-[12px] text-[var(--color-text-muted)]">
                      <p className="flex items-center gap-1.5">
                        <CalendarDaysIcon size={12} className="text-[var(--color-primary)]" />
                        {formatDateShort(event.event_date)}
                      </p>
                      {event.event_time && (
                        <p className="flex items-center gap-1.5">
                          <Clock3Icon size={12} className="text-[var(--color-primary)]" />
                          {formatTime(event.event_time)}
                        </p>
                      )}
                      {event.venue && (
                        <p className="flex items-center gap-1.5 truncate">
                          <MapPinIcon size={12} className="text-[var(--color-primary)]" />
                          {event.venue}
                        </p>
                      )}
                    </div>
                  </div>
                  <ArrowRightIcon size={18} className="mt-1 text-[var(--color-text-light)]" />
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-white/80 px-3 py-2">
                  <div>
                    <p className="text-[12px] font-semibold text-[var(--color-text)]">Shake to Scan</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {shakeEnabled && activeScanEvent === event.event_id
                        ? "Enabled"
                        : shakeEnabled && activeScanEvent
                          ? "Switch to this event"
                          : "Enable for this event"}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Toggle Shake to Scan"
                    title="Toggle Shake to Scan"
                    onClick={(eventClick) => {
                      eventClick.preventDefault();
                      eventClick.stopPropagation();
                      void handleToggleShake(event.event_id);
                    }}
                    className={`relative h-7 w-12 rounded-full transition-colors ${
                      shakeEnabled && activeScanEvent === event.event_id
                        ? "bg-emerald-500"
                        : "bg-slate-200"
                    }`}
                  >
                    <span className="sr-only">Toggle Shake to Scan</span>
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        shakeEnabled && activeScanEvent === event.event_id ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
