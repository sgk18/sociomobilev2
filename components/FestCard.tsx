"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, Users, ArrowRight } from "lucide-react";
import type { Fest } from "@/context/EventContext";
import { formatDateRange } from "@/lib/dateUtils";

function formatCompactCount(count: number) {
  if (!Number.isFinite(count) || count <= 0) return "0";
  if (count >= 1_000_000) {
    const value = count / 1_000_000;
    return `${parseFloat(value.toFixed(value >= 10 ? 0 : 1))}m`;
  }
  if (count >= 1_000) {
    const value = count / 1_000;
    return `${parseFloat(value.toFixed(value >= 10 ? 0 : 1))}k`;
  }
  return `${Math.round(count)}`;
}

type FestWithAttendance = Fest & {
  total_participants?: number | null;
  total_registrations?: number | null;
  registrations?: number | null;
  attendees?: number | null;
  attendee_count?: number | null;
};

export default function FestCard({ fest }: { fest: Fest }) {
  const rawId = fest.slug || fest.fest_id;
  // Guard: do not render a broken link if the fest has no navigable ID
  if (!rawId) return null;

  const href = `/fest/${rawId}`;
  const img = fest.fest_image_url || fest.banner_url || fest.image_url;
  const title = fest.fest_title || fest.name || "Fest";
  const dept = fest.organizing_dept || fest.department;
  const festWithAttendance = fest as FestWithAttendance;
  const attendeeCountRaw = Number(
    festWithAttendance.total_participants ??
      festWithAttendance.total_registrations ??
      festWithAttendance.registrations ??
      festWithAttendance.attendees ??
      festWithAttendance.attendee_count ??
      0
  );
  const attendeeCount = Number.isFinite(attendeeCountRaw)
    ? Math.max(0, attendeeCountRaw)
    : 0;
  const attendeeLabel = formatCompactCount(attendeeCount);

  return (
    <Link
      href={href}
      className="relative block w-full h-[220px] rounded-[1.25rem] overflow-hidden group shadow-[0_8px_24px_rgba(21,76,179,0.12)] cursor-pointer transition-all duration-300 active:scale-[0.97] border border-white/40 bg-white"
    >
      {img ? (
        <Image
          src={img}
          alt={title}
          fill
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          sizes="(max-width:480px) 100vw, 50vw"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#00368b] to-[#154cb3] flex items-center justify-center">
          <span className="text-white text-6xl font-black opacity-20">
            {title.charAt(0)}
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#171a2e] via-[#171a2e]/40 to-transparent"></div>
      <div className="absolute inset-0 p-5 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          {fest.category ? (
            <span className="bg-[#154cb3] text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">
              {fest.category}
            </span>
          ) : (
            <div />
          )}
          {attendeeCount > 0 && (
            <span className="bg-black/80 backdrop-blur-sm text-white/90 px-3 py-1 rounded-lg text-[10px] font-bold tracking-wide uppercase">
              {attendeeLabel} attending
            </span>
          )}
        </div>
        <div>
          {dept && (
            <p className="text-[#dae2ff] font-semibold text-xs uppercase tracking-wider mb-1">
              {dept}
            </p>
          )}
          <h3 className="text-2xl font-bold text-white leading-tight mb-1 drop-shadow-md">
            {title}
          </h3>
          <div className="flex items-center gap-2 text-[#e2e2e2] text-xs font-medium">
            <Calendar size={16} className="opacity-80" />
            <span>
              {formatDateRange(
                fest.opening_date || fest.start_date,
                fest.closing_date || fest.end_date
              )}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
