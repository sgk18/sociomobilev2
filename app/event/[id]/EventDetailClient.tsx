"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useEvents, type FetchedEvent } from "@/context/EventContext";
import { useAuth } from "@/context/AuthContext";
import { PWA_API_URL } from "@/lib/apiConfig";
import { formatDateUTC, formatTime, getDaysUntil } from "@/lib/dateUtils";
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

function parseJsonField<T>(raw: any): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((item) => (typeof item === "object" && item !== null && "value" in item ? item.value : item)) as T[];
  if (typeof raw === "string") { try { return parseJsonField(JSON.parse(raw)); } catch { return []; } }
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
  const [openSection, setOpenSection] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const toggle = (s: string) => setOpenSection(openSection === s ? null : s);

  useEffect(() => { if (regError && errorRef.current) { errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" }); errorRef.current.focus(); } }, [regError]);

  useEffect(() => {
    if (!eventId) { setError("Invalid event ID"); setLoading(false); return; }
    if (ctxLoading) return;
    const found = allEvents.find((e) => e.event_id === eventId);
    if (found) { setEvent(found); setLoading(false); return; }
    fetch(`${PWA_API_URL}/events/${eventId}`)
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then((d) => setEvent(d.event ?? d))
      .catch(() => setError("Event not found"))
      .finally(() => setLoading(false));
  }, [eventId, allEvents, ctxLoading]);

  useEffect(() => {
    if (!userData || authLoading) return;
    const registerNumber = userData.organization_type === "outsider" ? userData.visitor_id || userData.register_number || "" : userData.register_number || "";
    if (!registerNumber && !userData.email) return;
    const params = new URLSearchParams();
    if (registerNumber) params.set("registerNumber", String(registerNumber));
    if (userData.email) params.set("email", userData.email);
    fetch(`${PWA_API_URL}/registrations?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const registrations = Array.isArray(data) ? data : data?.registrations ?? data?.events ?? [];
        setRegisteredIds((Array.isArray(registrations) ? registrations : []).map((item: any) => item?.event_id || item?.id || item?.event?.event_id || item?.event?.id).filter(Boolean).map((id: any) => String(id)));
      })
      .catch(() => {});
  }, [userData, authLoading]);

  const handleRegister = async () => {
    if (!event) return;
    setRegError(null);
    if (authLoading) { setRegError("Verifying user data, please wait..."); return; }
    if (!userData) { if (typeof window !== "undefined") sessionStorage.setItem("returnTo", window.location.pathname); router.push("/auth"); return; }
    if (userData.organization_type === "outsider" && !event.allow_outsiders) { setRegError("OUTSIDER_NOT_ALLOWED"); setTimeout(() => { errorRef.current?.focus(); errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 50); return; }
    const customFields = parseJsonField(event.custom_fields);
    if (customFields.length > 0 || event.participants_per_team > 1) { router.push(`/event/${event.event_id}/register`); return; }
    let regNum = "";
    if (userData.organization_type === "outsider") {
      const vis = userData.visitor_id || userData.register_number;
      if (!vis || !String(vis).toUpperCase().startsWith("VIS")) { setRegError("Missing Visitor ID (VIS...) in your profile."); return; }
      regNum = String(vis);
    } else {
      const regNumStr = String(userData.register_number || "");
      if (!/^(?:\d{7}|STF[A-Z0-9]+)$/i.test(regNumStr)) { setRegError("Invalid registration number in your profile."); return; }
      regNum = regNumStr;
    }
    setIsRegistering(true);
    try {
      const res = await fetch(`${PWA_API_URL}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: event.event_id, teamName: null, teammates: [{ name: userData.name || "Unknown", registerNumber: regNum, email: userData.email || "" }] }) });
      if (res.ok) { setShowSuccess(true); setRegisteredIds((p) => (p.includes(event.event_id) ? p : [...p, event.event_id])); }
      else {
        const d = await res.json();
        if (res.status === 409 || d.code === "ALREADY_REGISTERED") { setRegisteredIds((p) => (p.includes(event.event_id) ? p : [...p, event.event_id])); setRegError(null); return; }
        setRegError(d.error || d.message || "Registration failed.");
      }
    } catch { setRegError("Network error. Please try again."); }
    finally { setIsRegistering(false); }
  };

  const isRegistered = event ? registeredIds.includes(event.event_id) : false;
  const daysLeft = event ? getDaysUntil(event.registration_deadline) : null;
  const isClosed = daysLeft !== null && daysLeft < 0;
  const isFree = !event?.registration_fee || event.registration_fee <= 0;
  const rules = event ? parseJsonField<string>(event.rules) : [];
  const schedule = event ? parseJsonField<{ time: string; activity: string }>(event.schedule) : [];
  const prizes = event ? parseJsonField<string>(event.prizes) : [];

  if (loading || ctxLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }
  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <AlertCircle size={40} className="text-red-400" />
        <p className="font-bold text-lg">{error || "Event not found"}</p>
        <Link href="/discover"><Button variant="primary" size="sm">Back to discover</Button></Link>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="card p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-black text-[var(--color-text)] mb-1">You&apos;re registered!</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">Successfully registered for {event.title}</p>
          <div className="flex flex-col gap-2">
            <Link href="/discover" className="block w-full"><Button variant="primary" size="sm" fullWidth>Back to Discover</Button></Link>
            {event.whatsapp_invite_link && (
              <a href={event.whatsapp_invite_link} target="_blank" rel="noopener noreferrer" className="block w-full">
                <Button variant="ghost" size="sm" fullWidth className="text-green-600 border border-green-300" leftIcon={<MessageCircle size={16} />}>Join WhatsApp</Button>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  const AccordionSection = ({ id, icon, title, children }: { id: string; icon: React.ReactNode; title: string; children: React.ReactNode }) => {
    const open = openSection === id;
    return (
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white mb-3">
        <button onClick={() => toggle(id)} className="flex items-center justify-between w-full px-4 py-4 text-left">
          <div className="flex items-center gap-2.5 font-bold text-[14px] text-[var(--color-text)]">{icon}{title}</div>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${open ? "bg-[var(--color-primary)] text-white" : "bg-gray-100 text-[var(--color-text-muted)]"}`}>
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        </button>
        {open && <div className="px-4 pb-4 pt-0 text-sm border-t border-[var(--color-border)]">{children}</div>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-[calc(var(--bottom-nav)+var(--safe-bottom)+100px)]">

      {/* ── Full-bleed hero ── */}
      <div className="relative w-full" style={{ aspectRatio: "4/3", maxHeight: 320 }}>
        <Image
          src={event.banner_url || event.event_image_url || "https://placehold.co/800x600/1a237e/ffffff?text=Event"}
          alt={event.title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        {/* gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />

        {/* top-left chips */}
        <div className="absolute top-[calc(var(--safe-top)+52px)] left-3 flex flex-wrap gap-1.5 z-10">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/95 text-[var(--color-primary)] shadow-sm">
            {isFree ? "Free" : `₹${event.registration_fee}`}
          </span>
          {event.allow_outsiders && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/95 text-[var(--color-primary)] shadow-sm flex items-center gap-1">
              <Globe size={10} /> Open
            </span>
          )}
          {event.claims_applicable && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[var(--color-accent)]/90 text-white shadow-sm">Claims</span>
          )}
        </div>

        {/* title block */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 pt-10 z-10">
          {event.organizing_dept && (
            <p className="text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-1">{event.organizing_dept}</p>
          )}
          <h1 className="text-[22px] font-black text-white leading-tight drop-shadow-lg">{event.title}</h1>
        </div>
      </div>

      {/* ── Meta info card ── */}
      <div className="mx-4 -mt-5 relative z-20 bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] p-4 mb-4">
        <div className="grid grid-cols-1 gap-2.5">
          {/* Date */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
              <CalendarDays size={15} className="text-[var(--color-primary)]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-[var(--color-text-light)] uppercase tracking-wider">Date</p>
              <p className="text-[13px] font-bold text-[var(--color-text)]">
                {formatDateUTC(event.event_date)}
                {event.end_date && event.end_date !== event.event_date && <> – {formatDateUTC(event.end_date)}</>}
              </p>
            </div>
          </div>

          {/* Time */}
          {event.event_time && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
                <Clock size={15} className="text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[var(--color-text-light)] uppercase tracking-wider">Time</p>
                <p className="text-[13px] font-bold text-[var(--color-text)]">{formatTime(event.event_time)}</p>
              </div>
            </div>
          )}

          {/* Venue */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
              <MapPin size={15} className="text-[var(--color-primary)]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-[var(--color-text-light)] uppercase tracking-wider">Venue</p>
              <p className="text-[13px] font-bold text-[var(--color-text)] leading-snug">{event.venue || "TBD"}</p>
            </div>
          </div>

          {/* Tag row */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {event.participants_per_team > 1 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold">
                <Users size={11} /> Team of {event.participants_per_team}
              </span>
            )}
            {event.category && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-[var(--color-text-muted)] text-[11px] font-semibold">
                <Tag size={11} /> {event.category}
              </span>
            )}
            {daysLeft !== null && !isClosed && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${daysLeft <= 3 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                <Ticket size={11} /> {daysLeft === 0 ? "Last day!" : `${daysLeft}d left`}
              </span>
            )}
            {daysLeft === null && !isClosed && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                <Ticket size={11} /> Open registration
              </span>
            )}
            {isClosed && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-[11px] font-semibold">
                <Ticket size={11} /> Registration closed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Content sections ── */}
      <div className="px-4 space-y-3">

        {/* About */}
        {event.description && (
          <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)]">
            <h2 className="text-[13px] font-black text-[var(--color-text)] uppercase tracking-wider mb-2">About</h2>
            <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        {/* Accordion sections */}
        {rules.length > 0 && (
          <AccordionSection id="rules" icon={<ListChecks size={16} className="text-[var(--color-primary)]" />} title={`Rules (${rules.length})`}>
            <ul className="space-y-2 pt-3">
              {rules.map((r, i) => (
                <li key={i} className="flex gap-2.5 text-[13px] text-[var(--color-text-muted)]">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  {String(r)}
                </li>
              ))}
            </ul>
          </AccordionSection>
        )}

        {schedule.length > 0 && (
          <AccordionSection id="schedule" icon={<Clock size={16} className="text-[var(--color-primary)]" />} title="Schedule">
            <div className="space-y-3 pt-3">
              {schedule.map((s, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="shrink-0 min-w-[56px] text-[11px] font-mono font-bold text-[var(--color-primary)] bg-[var(--color-primary-light)] px-2 py-1 rounded-lg text-center">{s.time || `#${i + 1}`}</div>
                  <p className="text-[13px] text-[var(--color-text-muted)] pt-1">{s.activity}</p>
                </div>
              ))}
            </div>
          </AccordionSection>
        )}

        {prizes.length > 0 && (
          <AccordionSection id="prizes" icon={<Trophy size={16} className="text-[var(--color-primary)]" />} title="Prizes">
            <ul className="space-y-2 pt-3">
              {prizes.map((p, i) => (
                <li key={i} className="flex items-center gap-2.5 text-[13px] text-[var(--color-text-muted)]">
                  <Award size={14} className="text-[var(--color-primary)] shrink-0" />
                  {String(p)}
                </li>
              ))}
            </ul>
          </AccordionSection>
        )}

        {/* PDF */}
        {event.pdf_url && (
          <a href={event.pdf_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-[var(--color-border)] active:bg-gray-50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <FileText size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[var(--color-text)]">Event Document</p>
              <p className="text-[11px] text-[var(--color-text-muted)]">Tap to view PDF</p>
            </div>
          </a>
        )}

        {/* Contact */}
        {(event.organizer_email || event.organizer_phone || event.whatsapp_invite_link) && (
          <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)]">
            <h3 className="text-[13px] font-black text-[var(--color-text)] uppercase tracking-wider mb-3">Contact</h3>
            <div className="flex flex-col gap-2.5">
              {event.organizer_email && (
                <a href={`mailto:${event.organizer_email}`} className="flex items-center gap-3 text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
                  <div className="w-7 h-7 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
                    <Mail size={13} className="text-[var(--color-primary)]" />
                  </div>
                  <span className="truncate">{event.organizer_email}</span>
                </a>
              )}
              {event.organizer_phone && (
                <a href={`tel:${event.organizer_phone}`} className="flex items-center gap-3 text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
                  <div className="w-7 h-7 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
                    <Phone size={13} className="text-[var(--color-primary)]" />
                  </div>
                  <span>{event.organizer_phone}</span>
                </a>
              )}
              {event.whatsapp_invite_link && (
                <a href={event.whatsapp_invite_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-[13px] text-green-600">
                  <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                    <MessageCircle size={13} className="text-green-600" />
                  </div>
                  <span className="font-semibold">Join WhatsApp Group</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Error feedback */}
        {regError && (
          regError === "OUTSIDER_NOT_ALLOWED" ? (
            <div ref={errorRef} tabIndex={-1} className="rounded-2xl bg-red-50 border border-red-200 p-4 outline-none">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle size={18} className="text-red-600" />
                </div>
                <div>
                  <h4 className="font-bold text-red-800 text-[13px]">Members only</h4>
                  <p className="text-red-700 text-[12px] mt-0.5">This event is open to Christ University members only. External participants cannot register.</p>
                </div>
              </div>
            </div>
          ) : (
            <div ref={errorRef} tabIndex={-1} className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-[13px] text-amber-800 flex items-start gap-2.5 outline-none">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{regError}</span>
            </div>
          )
        )}
      </div>

      {/* ── Sticky bottom CTA ── */}
      <div className="fixed bottom-[calc(var(--bottom-nav)+var(--safe-bottom)+12px)] left-1/2 -translate-x-1/2 w-[min(92vw,420px)] z-40">
        <div className="bg-white/96 backdrop-blur-xl border border-[var(--color-border)] shadow-[0_8px_32px_rgba(0,0,0,0.14)] rounded-[22px] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <p className="text-[20px] font-black text-[var(--color-text)] leading-none">
                {isFree ? "Free" : `₹${event.registration_fee}`}
              </p>
              {event.participants_per_team > 1 && (
                <p className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5">per team</p>
              )}
            </div>
            <Button
              onClick={handleRegister}
              disabled={isRegistered || isClosed || isRegistering || authLoading}
              variant={isRegistered || isClosed ? "ghost" : "primary"}
              fullWidth
              className={`flex-1 h-12 rounded-[14px] text-[14px] font-extrabold ${
                isRegistered ? "!bg-emerald-100 !text-emerald-700" :
                isClosed ? "!bg-gray-100 !text-gray-400" : ""
              }`}
              leftIcon={
                isRegistering ? <Loader2 size={18} className="animate-spin" /> :
                isRegistered ? <CheckCircle2 size={17} /> : undefined
              }
            >
              {isRegistering ? "Registering…" :
               isRegistered ? "Registered" :
               isClosed ? "Closed" :
               event.participants_per_team > 1 ? "Register Team" : "Register Now"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
