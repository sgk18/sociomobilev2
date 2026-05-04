"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useEvents, type FetchedEvent } from "@/context/EventContext";
import { useAuth } from "@/context/AuthContext";
import { PWA_API_URL } from "@/lib/apiConfig";
import {
  formatDateUTC,
  formatTime,
  getDaysUntil,
  formatDateRange,
} from "@/lib/dateUtils";
import {
  ArrowLeftIcon as ArrowLeft,
  CalendarIcon as CalendarDays,
  ClockIcon as Clock,
  MapPinIcon as MapPin,
  UsersIcon as Users,
  TagIcon as Tag,
  TicketIcon as Ticket,
  GlobeIcon as Globe,
  FileTextIcon as FileText,
  TrophyIcon as Trophy,
  ListChecksIcon as ListChecks,
  PhoneIcon as Phone,
  MailIcon as Mail,
  MessageCircleIcon as MessageCircle,
  CheckCircleIcon as CheckCircle2,
  AlertCircleIcon as AlertCircle,
  Loader2Icon as Loader2,
  ChevronDownIcon as ChevronDown,
  ChevronUpIcon as ChevronUp,
  AwardIcon as Award,
} from "@/components/icons";
import { Button } from "@/components/Button";

/* ── helpers ── */
function parseJsonField<T>(raw: any): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) =>
      typeof item === "object" && item !== null && "value" in item
        ? item.value
        : item
    ) as T[];
  }
  if (typeof raw === "string") {
    try {
      return parseJsonField(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

export default function EventDetailClient({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { allEvents, isLoading: ctxLoading } = useEvents();
  const { userData, isLoading: authLoading } = useAuth();

  const [event, setEvent] = useState<FetchedEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [registeredIds, setRegisteredIds] = useState<string[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggle = (s: string) => setOpenSection(openSection === s ? null : s);

  useEffect(() => {
    if (regError && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      errorRef.current.focus();
    }
  }, [regError]);

  /* ── Load event ── */
  useEffect(() => {
    if (!eventId) {
      setError("Invalid event ID");
      setLoading(false);
      return;
    }
    if (ctxLoading) return;

    const found = allEvents.find((e) => e.event_id === eventId);
    if (found) {
      setEvent(found);
      setLoading(false);
      return;
    }

    fetch(`${PWA_API_URL}/events/${eventId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((d) => setEvent(d.event ?? d))
      .catch(() => setError("Event not found"))
      .finally(() => setLoading(false));
  }, [eventId, allEvents, ctxLoading]);

  /* ── Load user registrations ── */
  useEffect(() => {
    if (!userData || authLoading) return;

    const registerNumber =
      userData.organization_type === "outsider"
        ? userData.visitor_id || userData.register_number || ""
        : userData.register_number || "";

    if (!registerNumber && !userData.email) return;

    const params = new URLSearchParams();
    if (registerNumber) params.set("registerNumber", String(registerNumber));
    if (userData.email) params.set("email", userData.email);

    fetch(`${PWA_API_URL}/registrations?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const registrations = Array.isArray(data)
          ? data
          : data?.registrations ?? data?.events ?? [];

        const ids = (Array.isArray(registrations) ? registrations : [])
          .map((item: any) =>
            item?.event_id || item?.id || item?.event?.event_id || item?.event?.id
          )
          .filter(Boolean)
          .map((id: any) => String(id));

        setRegisteredIds(ids);
      })
      .catch(() => {});
  }, [userData, authLoading]);

  const handleRegister = async () => {
    if (!event) return;
    setRegError(null);

    if (authLoading) {
      setRegError("Verifying user data, please wait...");
      return;
    }

    if (!userData) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("returnTo", window.location.pathname);
      }
      router.push("/auth");
      return;
    }

    if (userData.organization_type === "outsider" && !event.allow_outsiders) {
      setRegError("OUTSIDER_NOT_ALLOWED");
      setTimeout(() => {
        errorRef.current?.focus();
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    const customFields = parseJsonField(event.custom_fields);
    if (customFields.length > 0 || event.participants_per_team > 1) {
      router.push(`/event/${event.event_id}/register`);
      return;
    }

    let regNum = "";
    if (userData.organization_type === "outsider") {
      const vis = userData.visitor_id || userData.register_number;
      if (!vis || !String(vis).toUpperCase().startsWith("VIS")) {
        setRegError("Missing Visitor ID (VIS...) in your profile.");
        return;
      }
      regNum = String(vis);
    } else {
      const regNumStr = String(userData.register_number || "");
      if (!/^(?:\d{7}|STF[A-Z0-9]+)$/i.test(regNumStr)) {
        setRegError("Invalid registration number in your profile. It must be 7 digits or a valid STF ID.");
        return;
      }
      regNum = regNumStr;
    }

    setIsRegistering(true);
    try {
      const res = await fetch(`${PWA_API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.event_id,
          teamName: null,
          teammates: [
            {
              name: userData.name || "Unknown",
              registerNumber: regNum,
              email: userData.email || "",
            },
          ],
        }),
      });
      if (res.ok) {
        setShowSuccess(true);
        setRegisteredIds((p) => (p.includes(event.event_id) ? p : [...p, event.event_id]));
      } else {
        const d = await res.json();
        const err = d.error || d.message || "Registration failed.";
        if (res.status === 409 || d.code === "ALREADY_REGISTERED") {
          setRegisteredIds((p) => (p.includes(event.event_id) ? p : [...p, event.event_id]));
          setRegError(null);
          return;
        }
        setRegError(err);
      }
    } catch {
      setRegError("Network error. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  const isRegistered = event ? registeredIds.includes(event.event_id) : false;
  const daysLeft = event ? getDaysUntil(event.registration_deadline) : null;
  const isClosed = daysLeft !== null && daysLeft < 0;
  const isFree = !event?.registration_fee || event.registration_fee <= 0;
  const rules = event ? parseJsonField<string>(event.rules) : [];
  const schedule = event
    ? parseJsonField<{ time: string; activity: string }>(event.schedule)
    : [];
  const prizes = event ? parseJsonField<string>(event.prizes) : [];

  if (loading || ctxLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }
  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <AlertCircle size={40} className="text-red-400" />
        <p className="font-bold text-lg">{error || "Event not found"}</p>
        <Link href="/discover" className="block mt-2">
          <Button variant="primary" size="sm">
            Back to discover
          </Button>
        </Link>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-6">
        <div className="card p-6 text-center max-w-sm w-full animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-1">
            You&apos;re registered!
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-5">
            Successfully registered for {event.title}
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/discover" className="block w-full">
              <Button variant="primary" size="sm" fullWidth>
                Back to Discover
              </Button>
            </Link>
            {event.whatsapp_invite_link && (
              <a
                href={event.whatsapp_invite_link}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                <Button variant="ghost" size="sm" fullWidth className="text-green-600 border border-green-300" leftIcon={<MessageCircle size={16} />}>
                  Join WhatsApp
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  const Section = ({
    id,
    icon,
    title,
    children,
  }: {
    id: string;
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
  }) => {
    const open = openSection === id;
    return (
      <div className="card mb-2 overflow-hidden">
        <button
          onClick={() => toggle(id)}
          className="flex items-center justify-between w-full p-3.5 text-left"
        >
          <div className="flex items-center gap-2 font-semibold text-sm">
            {icon}
            {title}
          </div>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {open && <div className="px-3.5 pb-3.5 pt-0 text-sm animate-fade-in">{children}</div>}
      </div>
    );
  };

  return (
    <div className="pwa-page pb-[calc(var(--bottom-nav)+var(--safe-bottom)+120px)] pt-[calc(var(--nav-height)+var(--safe-top)+16px)]">
      <div className="relative aspect-[16/9] mx-4 rounded-2xl overflow-hidden bg-gray-100">
        <Image
          src={
            event.banner_url ||
            event.event_image_url ||
            "https://placehold.co/800x450/e2e8f0/94a3b8?text=Event"
          }
          alt={event.title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {isFree ? (
            <span className="chip bg-white/90 text-[var(--color-primary)] font-bold">Free</span>
          ) : (
            <span className="chip bg-white/90 text-[var(--color-primary)] font-bold">
              ₹{event.registration_fee}
            </span>
          )}
          {event.allow_outsiders && (
            <span className="chip bg-white/90 text-[var(--color-primary)]">
              <Globe size={10} /> Open
            </span>
          )}
          {event.claims_applicable && (
            <span className="chip bg-white/90 text-[var(--color-primary)]">Claims</span>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h1 className="text-xl font-extrabold text-white leading-tight drop-shadow-lg">
            {event.title}
          </h1>
          {event.organizing_dept && (
            <span className="text-xs text-white/80">{event.organizing_dept}</span>
          )}
        </div>
      </div>

      <div className="px-4 mt-3 flex flex-wrap gap-2">
        <div className="chip bg-[var(--color-primary-light)] text-[var(--color-primary)]">
          <CalendarDays size={12} />
          {formatDateUTC(event.event_date)}
          {event.end_date && event.end_date !== event.event_date && (
            <> – {formatDateUTC(event.end_date)}</>
          )}
        </div>
        {event.event_time && (
          <div className="chip bg-[var(--color-primary-light)] text-[var(--color-primary)]">
            <Clock size={12} /> {formatTime(event.event_time)}
          </div>
        )}
        <div className="chip bg-[var(--color-primary-light)] text-[var(--color-primary)]">
          <MapPin size={12} /> {event.venue || "TBD"}
        </div>
        {event.participants_per_team > 1 && (
          <div className="chip bg-[var(--color-primary-light)] text-[var(--color-primary)]">
            <Users size={12} /> Team of {event.participants_per_team}
          </div>
        )}
        {event.category && (
          <div className="chip bg-gray-100 text-[var(--color-text-muted)]">
            <Tag size={12} /> {event.category}
          </div>
        )}
        {daysLeft !== null && !isClosed && (
          <div
            className={`chip ${
              daysLeft <= 3 ? "bg-red-50 text-red-600" : "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
            }`}
          >
            <Ticket size={12} />
            {daysLeft === 0 ? "Last day!" : `${daysLeft} days left`}
          </div>
        )}
        {daysLeft === null && !isClosed && (
          <div className="chip bg-[var(--color-primary-light)] text-[var(--color-primary)]">
            <Ticket size={12} /> Open Registration
          </div>
        )}
      </div>

      <div className="px-4 mt-4">
        <div className="card p-4">
          <h2 className="font-bold text-sm mb-2">About</h2>
          <p className="text-sm text-[var(--color-text-muted)] whitespace-pre-wrap leading-relaxed">
            {event.description}
          </p>
        </div>
      </div>

      <div className="px-4 mt-3">
        {rules.length > 0 && (
          <Section id="rules" icon={<ListChecks size={16} className="text-[var(--color-primary)]" />} title={`Rules (${rules.length})`}>
            <ul className="space-y-1.5">
              {rules.map((r, i) => (
                <li key={i} className="flex gap-2 text-[var(--color-text-muted)]">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  {String(r)}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {schedule.length > 0 && (
          <Section id="schedule" icon={<Clock size={16} className="text-[var(--color-primary)]" />} title="Schedule">
            <div className="space-y-2">
              {schedule.map((s, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="shrink-0 w-14 text-xs font-mono font-semibold text-[var(--color-primary)] pt-0.5">
                    {s.time || `#${i + 1}`}
                  </div>
                  <p className="text-[var(--color-text-muted)]">{s.activity}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {prizes.length > 0 && (
          <Section id="prizes" icon={<Trophy size={16} className="text-[var(--color-primary)]" />} title="Prizes">
            <ul className="space-y-1.5">
              {prizes.map((p, i) => (
                <li key={i} className="flex items-center gap-2 text-[var(--color-text-muted)]">
                  <Award size={14} className="text-[var(--color-primary)]" />
                  {String(p)}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {event.pdf_url && (
          <a
            href={event.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="card flex items-center gap-3 p-3.5 mb-2"
          >
            <FileText size={20} className="text-[var(--color-primary)] shrink-0" />
            <div>
              <p className="text-sm font-semibold">Event Document</p>
              <p className="text-xs text-[var(--color-text-muted)]">Tap to view PDF</p>
            </div>
          </a>
        )}

        {(event.organizer_email || event.organizer_phone) && (
          <div className="card p-4 mb-2">
            <h3 className="font-bold text-sm mb-2">Contact</h3>
            <div className="flex flex-col gap-1.5 text-sm text-[var(--color-text-muted)]">
              {event.organizer_email && (
                <a href={`mailto:${event.organizer_email}`} className="flex items-center gap-2">
                  <Mail size={14} /> {event.organizer_email}
                </a>
              )}
              {event.organizer_phone && (
                <a href={`tel:${event.organizer_phone}`} className="flex items-center gap-2">
                  <Phone size={14} /> {event.organizer_phone}
                </a>
              )}
              {event.whatsapp_invite_link && (
                <a href={event.whatsapp_invite_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600">
                  <MessageCircle size={14} /> WhatsApp Group
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {regError && (
        regError === "OUTSIDER_NOT_ALLOWED" ? (
          <div
            ref={errorRef}
            tabIndex={-1}
            className="mx-4 mt-2 rounded-[var(--radius)] bg-red-50 border border-red-200 p-3 shadow-sm outline-none"
          >
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle size={16} className="text-red-600" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-red-800 text-[13px] leading-tight">Registration restricted</h4>
                <p className="text-red-700 text-[12px] mt-0.5 leading-snug">
                  This event is only for Christ University members.
                </p>
                <div className="mt-1.5 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5">
                  <p className="text-red-700 text-[11px] font-medium">External participants cannot register</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            ref={errorRef}
            tabIndex={-1}
            className="mx-4 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-start gap-2 animate-fade-up outline-none"
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{regError}</span>
          </div>
        )
      )}

      <div className="fixed bottom-[calc(var(--bottom-nav)+var(--safe-bottom)+20px)] left-1/2 -translate-x-1/2 w-[min(92vw,400px)] z-40 bg-white/95 backdrop-blur-xl border border-[var(--color-border)] shadow-[0_12px_40px_rgba(17,24,39,0.15)] p-3 px-4 rounded-[20px] animate-slide-up">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-extrabold text-[var(--color-text)]">
              {isFree ? "Free" : `₹${event.registration_fee}`}
            </p>
            {event.participants_per_team > 1 && (
              <p className="text-[10px] text-[var(--color-text-muted)]">per team</p>
            )}
          </div>
          <Button
            onClick={handleRegister}
            disabled={isRegistered || isClosed || isRegistering || authLoading}
            variant={isRegistered || isClosed ? "ghost" : "primary"}
            className={`flex-1 max-w-[200px] ${
              isRegistered
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                : isClosed
                ? "bg-gray-200 text-gray-500 hover:bg-gray-200"
                : ""
            }`}
            leftIcon={
              isRegistering ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isRegistered ? (
                <CheckCircle2 size={16} />
              ) : undefined
            }
          >
            {isRegistering ? (
              ""
            ) : isRegistered ? (
              "Registered"
            ) : isClosed ? (
              "Closed"
            ) : event.participants_per_team > 1 ? (
              "Register team"
            ) : (
              "Register now"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
